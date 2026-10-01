#!/usr/bin/env python3
"""Fill missing staining and granulation in data/paints.json from each paint's pigments.

Run from the repo root:  python3 tools/infer_properties.py
It rewrites data/paints.json and data/inference-report.md. It is safe to run again: values it
filled on an earlier run are cleared first, so only the brands' own ratings feed the lookup.

Method
1. Pigment lookup. For every paint with one pigment code and a brand-stated rating, each brand gets
   one vote per pigment code (split if that brand rates the code both ways). The code's
   value is the rating with the most brand votes.
2. Family defaults for codes no brand rates (FAMILY below).
3. Mixtures use "any component": a mix granulates if any pigment granulates and stains as
   much as its most staining pigment. If a component is unknown and none decides the result,
   the mix stays unknown.
4. Every paint gets stainSrc / granSrc: "brand" (the maker's rating), "pigment" (lookup),
   "family" (family default) or "uncertain" (no value filled, see below).
5. Validation: each brand is held out in turn, its stated values are predicted from the
   other brands with steps 1-3, and the hits are counted per pigment. A pigment whose
   held-out agreement is low, or whose brand votes are split, gives "uncertain" instead of
   a value.

Brand silence. W&N, Schmincke, Holbein, QoR and Da Vinci mark only granulating paints, and
W&N, Cotman and Da Vinci only mark staining ones. When one of those brands leaves a paint
unmarked but the pigment says it should be marked, the brand's silence and the pigment
disagree, so the value is "uncertain" rather than a guess against the brand's own chart.
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "paints.json"
REPORT = ROOT / "data" / "inference-report.md"

# brands that only ever mark one side of the property (see "Brand silence" above)
MARKS_ONLY_GRAN = {"wn", "qor", "schmincke", "holbein", "davinci"}
MARKS_ONLY_STAIN = {"wn", "cotman", "davinci"}

# A pigment is filled only when its brands mostly agree:
MIN_VOTE_SHARE = 0.6   # share of brand votes for the winning rating
MIN_HOLDOUT = 0.6      # held-out agreement, when at least HOLDOUT_N paints were tested
HOLDOUT_N = 3

# Family defaults, used only for codes that no brand rates. (stain, gran); None = no default.
FAMILIES = {
    "organic": (3, "N"),      # quinacridones, phthalos, pyrroles, azos, perylenes, dioxazine, dyes
    "mineral": (1, "G"),      # cobalts, ultramarines, cerulean, manganese, genuine minerals
    "earth": (2, "G"),        # iron oxides and natural earths: brands vary a lot
    "cadmium": (1, "N"),
    "carbon": (3, "N"),       # carbon and lamp blacks
    "bone": (2, "G"),         # bone black
    "white": (1, "N"),
}
FAMILY = {}
for fam, codes in {
    "organic": """PB15 PB16 PB27 PB60 PB66 PG7 PG8 PG36 PO13 PO36 PO43 PO48 PO62 PO64 PO67 PO71 PO73
        PR3 PR48:4 PR81:1 PR83 PR88 PR122 PR144 PR146 PR149 PR168 PR170 PR171 PR175 PR176 PR177 PR178
        PR179 PR187 PR188 PR202 PR206 PR207 PR209 PR242 PR254 PR255 PR264 PV19 PV23 PV29 PV32 PV37
        PV42 PV55 PY3 PY65 PY74 PY83 PY93 PY97 PY110 PY128 PY129 PY138 PY139 PY150 PY151 PY153 PY154
        PY155 PY175 PBk1 PBk31 PBr23 PBr25 PBr41 BR1 BV1 BV7 BV10 BV11 BV15""",
    "mineral": """PB28 PB29 PB33 PB35 PB36 PB36:1 PB72 PB74 PV14 PV15 PV16 PV47 PV49 PG17 PG18 PG19 PG26
        PG50 PY40 PR233 PBk10 PBk19""",
    "earth": "PR101 PR102 PY42 PY43 PBr6 PBr7 PBr11 PBr33 PG23 PBk11",
    "cadmium": "PY35 PY37 PO20 PR108",
    "carbon": "PBk6 PBk7",
    "bone": "PBk9",
    "white": "PW4 PW5 PW6",
}.items():
    for c in codes.split():
        FAMILY[c] = fam


def base_code(c):
    return re.sub(r":\d+$", "", c)


def vote_table(paints, key, skip_brand=None):
    """code -> Counter(rating -> brand votes), from brand-stated single-pigment paints."""
    per = defaultdict(lambda: defaultdict(Counter))  # code -> brand -> Counter
    for p in paints:
        # one pigment code, even if the source calls the paint a mixture (extenders, dyes)
        if p["brand"] == skip_brand or len(set(p.get("pig") or [])) != 1:
            continue
        v = p.get(key)
        # a brand that marks granulating paints is saying the paints it leaves unmarked are smooth
        if v is None and key == "gran" and p["brand"] in MARKS_ONLY_GRAN:
            v = "N"
        if v is not None:
            per[p["pig"][0]][p["brand"]][v] += 1
    out = {}
    for code, brands in per.items():
        votes = Counter()
        for cnt in brands.values():
            n = sum(cnt.values())
            for v, k in cnt.items():
                votes[v] += k / n
        out[code] = votes
    return out


def rate_code(code, votes, key):
    """Value for one pigment code: (value, source, note). value None means unknown."""
    v = votes.get(code)
    if v is None and base_code(code) != code:
        v = votes.get(base_code(code))
    if v:
        n = sum(v.values())
        (top, w), *rest = v.most_common()
        if rest and abs(rest[0][1] - w) < 1e-9 or w / n < MIN_VOTE_SHARE:
            return None, "uncertain", "brands disagree"
        return top, "pigment", None
    fam = FAMILY.get(code) or FAMILY.get(base_code(code))
    if fam:
        d = FAMILIES[fam][0 if key == "stain" else 1]
        return d, "family", fam
    return None, None, None


def combine(vals, key):
    """'Any component' rule for a mix. vals: list of (value, source)."""
    known = [v for v, s in vals if v is not None]
    worst = "G" if key == "gran" else 3
    if worst in known:
        src = min((s for v, s in vals if v == worst), key=SRC_RANK.get)
        return worst, src
    if len(known) < len(vals):
        return None, "uncertain" if any(s == "uncertain" for _, s in vals) else None
    val = "N" if key == "gran" else max(known)
    # a mix is only as well-founded as its weakest component
    return val, max((s for _, s in vals), key=SRC_RANK.get)


SRC_RANK = {"pigment": 0, "family": 1, "uncertain": 2}


def predict(p, key, votes, weak, weak_mix=False):
    """Steps 1-3 for one paint. weak = codes whose held-out agreement is too low;
    weak_mix = the mix rule itself failed the held-out test for this property."""
    codes = p.get("pig") or []
    if not codes:
        return None, None
    vals = []
    for c in dict.fromkeys(codes):
        v, s, _ = rate_code(c, votes, key)
        if s == "pigment" and (c in weak or base_code(c) in weak):
            v, s = None, "uncertain"
        vals.append((v, s))
    if len(vals) == 1:
        return vals[0]
    v, s = combine(vals, key)
    if weak_mix and v is not None:
        return None, "uncertain"
    return v, s


def write(doc):
    """Same layout as the source file: header on the first line, then one paint per line."""
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    for i, p in enumerate(doc["paints"]):
        q = {}
        for k, v in p.items():
            if not k.endswith("Src"):
                q[k] = v
            if k in ("stain", "gran") and k + "Src" in p:
                q[k + "Src"] = p[k + "Src"]
        # a paint with no value still records why
        for k in ("stain", "gran"):
            if k + "Src" in p and k + "Src" not in q:
                q[k + "Src"] = p[k + "Src"]
        doc["paints"][i] = q
    head = dump({k: v for k, v in doc.items() if k != "paints"})[:-1]
    DATA.write_text(head + ',"paints":[' + ",\n".join(dump(p) for p in doc["paints"]) + "]}")


def main():
    doc = json.loads(DATA.read_text())
    paints = doc["paints"]
    # start from the brands' own ratings only
    for p in paints:
        for key in ("stain", "gran"):
            if p.get(key + "Src") not in (None, "brand"):
                p.pop(key, None)
            p.pop(key + "Src", None)

    brands = [b["key"] for b in doc["brands"]]
    report = ["# Staining and granulation inference report", "",
              "Generated by `tools/infer_properties.py`. See the docstring there for the method.", ""]
    weak_by_key, weak_mix = {}, {}
    for key, label in (("stain", "Staining"), ("gran", "Granulation")):
        # ---- step 5: hold out each brand and predict its stated values from the others ----
        hits = defaultdict(lambda: [0, 0])  # code (singles) -> [match, tested]
        mix = [0, 0]
        by_brand = defaultdict(lambda: [0, 0])
        for b in brands:
            votes = vote_table(paints, key, skip_brand=b)
            for p in paints:
                if p["brand"] != b or p.get(key) is None:
                    continue
                v, s = predict(p, key, votes, set())
                if v is None:
                    continue
                ok = v == p[key]
                by_brand[b][0] += ok
                by_brand[b][1] += 1
                codes = list(dict.fromkeys(p.get("pig") or []))
                if len(codes) == 1:
                    hits[codes[0]][0] += ok
                    hits[codes[0]][1] += 1
                else:
                    mix[0] += ok
                    mix[1] += 1
        weak = {c for c, (m, n) in hits.items() if n >= HOLDOUT_N and m / n < MIN_HOLDOUT}
        weak_by_key[key] = weak
        weak_mix[key] = bool(mix[1]) and mix[0] / mix[1] < MIN_HOLDOUT
        tot = [sum(h[0] for h in hits.values()), sum(h[1] for h in hits.values())]
        kept = [sum(h[0] for c, h in hits.items() if c not in weak), sum(h[1] for c, h in hits.items() if c not in weak)]

        report += [f"## {label}", "",
                   "Each brand held out in turn and predicted from the other brands.", "",
                   f"- One-pigment paints: {tot[0]} of {tot[1]} match ({tot[0] / tot[1]:.0%})",
                   f"- One-pigment paints whose pigment passes the test below: {kept[0]} of {kept[1]} match ({kept[0] / kept[1]:.0%})",
                   f"- Mixtures, by the any-component rule: {mix[0]} of {mix[1]} match ({mix[0] / mix[1]:.0%})"
                   + (" — below the bar, so inferred mixtures are left uncertain" if weak_mix[key] else ""),
                   "", "| Brand held out | Match | Tested | Rate |", "|---|---|---|---|"]
        for b in brands:
            m, n = by_brand[b]
            if n:
                report.append(f"| {b} | {m} | {n} | {m / n:.0%} |")
        report += ["", f"Per pigment (codes with at least {HOLDOUT_N} tested paints). "
                   f"Below {MIN_HOLDOUT:.0%} the pigment is left uncertain.", "",
                   "| Pigment | Match | Tested | Rate | Brand votes | Filled |", "|---|---|---|---|---|---|"]
        votes_all = vote_table(paints, key)
        for c, (m, n) in sorted(hits.items(), key=lambda kv: (kv[1][0] / kv[1][1], -kv[1][1])):
            if n < HOLDOUT_N:
                continue
            vv = ", ".join(f"{k}: {w:.1f}" for k, w in votes_all[c].most_common())
            report.append(f"| {c} | {m} | {n} | {m / n:.0%} | {vv} | {'uncertain' if c in weak else 'yes'} |")
        report.append("")

    # ---- fill ----
    filled = Counter()
    for key in ("stain", "gran"):
        votes = vote_table(paints, key)
        only = MARKS_ONLY_STAIN if key == "stain" else MARKS_ONLY_GRAN
        marked = 3 if key == "stain" else "G"
        for p in paints:
            if p.get(key) is not None:
                p[key + "Src"] = "brand"
                continue
            v, s = predict(p, key, votes, weak_by_key[key], weak_mix[key])
            if v == marked and p["brand"] in only:
                v, s = None, "uncertain"   # the brand marks this property and didn't mark this paint
            if v is not None:
                p[key] = v
            if s:
                p[key + "Src"] = s
            filled[(key, s or "unknown")] += 1

    report += ["## Filled", "", "| Property | Source | Paints |", "|---|---|---|"]
    for (key, s), n in sorted(filled.items()):
        report.append(f"| {key} | {s} | {n} |")
    report.append("")

    notes = doc["notes"]
    notes[:] = [n for n in notes if not n.startswith("stainSrc/granSrc")]
    notes.append("stainSrc/granSrc: where stain and gran come from. \"brand\" is the maker's rating; "
                 "\"pigment\" is inferred from how brands rate the same pigment; \"family\" is a "
                 "pigment-family default; \"uncertain\" means brands disagree for this pigment, so no "
                 "value is given. See tools/infer_properties.py and data/inference-report.md.")

    write(doc)
    REPORT.write_text("\n".join(report))
    for k, n in sorted(filled.items()):
        print(k, n)


if __name__ == "__main__":
    main()
