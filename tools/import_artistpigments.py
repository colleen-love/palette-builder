#!/usr/bin/env python3
"""Convert artistpigments.org exports into the app's data files.

Run from the repo root:
  python3 tools/import_artistpigments.py ds DANIEL_SMITH_EXPORT.json
      replaces the Daniel Smith paints in data/paints.json (then run tools/infer_properties.py)
  python3 tools/import_artistpigments.py opaque OPAQUE_EXPORT.json
      writes data/gouache.json, data/oil.json and data/acrylic.json

Both exports list paints per brand with the site's own wording ("Semi-Transparent",
"Low Staining", "★★★☆", "AA" with "ASTM I"...). This turns them into the app's fields:

- lf: lightfastness on one I-IV scale (1 best). An ASTM rating wins when there is one. Otherwise
  the brand's scale: AA/A/B/C; Excellent/Very good/Good/Fair/Poor (E/VG/G/F/P); roman I-IV; stars
  (all filled is I, then at least 3/4 filled II, at least half III, less IV; a brand's scale size
  is its longest rating, so "★★" on a three-star scale is III); Blue Wool 7-8 I, 6 II, 4-5 III,
  lower IV. "NR", "N/A" and anything unrecognised give no value. lfRaw keeps the brand's wording.
- trans: T, ST, SO or O.  stain (watercolor only): 1 non, 2 semi, 3 staining.  gran: G when marked.
- series without the "Series " prefix; disc when the site marks the paint discontinued.
- pig: Colour Index codes only (the site's mineral names like AMAZONITE are left out).
- src: "chart" for a printed chart, "maker" for manufacturer data; measured samples have none.
- dry (oil): fast, medium or slow, grouped from each brand's own wording or day range
  (up to 2 days fast, up to 7 medium, longer slow); dryRaw keeps the brand's wording.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

DUMP = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))

# brand keys from the site, with the short names the filter chips show
SHORT = {
    # gouache
    "holbein-irodori-artists-gouache": "Holbein Irodori",
    "rosa-studio-gouache-paint": "Rosa Studio",
    "royal-and-langnickel-essentials-gouache": "Royal & Langnickel",
    "arrtx-miya-gouache": "Arrtx Miya",
    "renesans-gouache": "Renesans",
    "renesans-tempera-one": "Renesans Tempera One",
    "holbein-artists-gouache": "Holbein",
    "rosa-gallery-professional-gouache-colours": "Rosa Gallery",
    "schmincke-horadam-gouache-series-12": "Schmincke Horadam",
    "schmincke-designers-gouache-hks-series-25": "Schmincke Designers'",
    "umton-tempera-gouache": "Umton",
    "maimeri-tempera-fine": "Maimeri Tempera Fine",
    "winsor-and-newton-designers-gouache": "Winsor & Newton",
    "nicker-designers-colour": "Nicker Designers",
    "nicker-poster-colour": "Nicker Poster",
    "da-vinci-permanent-artists-gouache": "Da Vinci",
    # oil
    "umton-finest-oil-colours-for-artists": "Umton",
    "winsor-and-newton-griffin-alkyd-fast-drying-oil-colour": "W&N Griffin Alkyd",
    "renesans-blur": "Renesans Blur",
    "couleurs-leroux-couleurs-fines-leroux": "Leroux Fines",
    "maimeri-artisti": "Maimeri Artisti",
    "michael-harding-artists-oil-colours": "Michael Harding",
    "couleurs-leroux-couleurs-extra-fines-leroux": "Leroux Extra-Fines",
    "old-holland-classic-oil-colours": "Old Holland",
    "rosa-gallery-oil-colour": "Rosa Gallery",
    "schmincke-norma-series-11": "Schmincke Norma",
    "renesans-oils-for-art": "Renesans",
    "maimeri-classico": "Maimeri Classico",
    "holbein-artists-oil-color-hoc": "Holbein",
    "schmincke-mussini-series-10": "Schmincke Mussini",
    "golden-williamsburg": "Williamsburg",
    # acrylic
    "liquitex-prime-japanese": "Liquitex Prime",
    "meeden-acrylic-pain": "Meeden",
    "vallejo-acrylic-studio": "Vallejo Studio",
    "winsor-and-newton-professional-acrylic": "Winsor & Newton",
    "holbein-fluid-acrylic": "Holbein Fluid",
    "old-holland-new-masters": "Old Holland",
    "renesans-flow": "Renesans Flow",
    "lascaux-artist": "Lascaux",
    "turner-u-35": "Turner U-35",
    "liquitex-basics-acrylics": "Liquitex Basics",
    "liquitex-acrylic-regular-type-japanese": "Liquitex Regular",
    "renesans-akryl": "Renesans A’kryl",
    "holbein-heavy-body-acrylic": "Holbein Heavy Body",
    "daler-rowney-cryla": "Daler Rowney Cryla",
    "vallejo-acrylic-artist-color": "Vallejo Artist",
    "golden-heavy-body": "Golden Heavy Body",
}

ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 4}
LETTER = {"AA": 1, "A": 2, "B": 3, "C": 4}
WORD = {"E": (1, "Excellent"), "VG": (2, "Very good"), "G": (3, "Good"), "F": (4, "Fair"), "P": (4, "Poor")}
TRANS = {"Transparent": "T", "Semi-Transparent": "ST", "Semi-Opaque": "SO", "Opaque": "O", "Very Opaque": "O"}
# Daniel Smith's four staining levels on the app's three (see the README for the choice)
STAIN = {"Non-Staining": 1, "Low Staining": 2, "Medium Staining": 2, "High Staining": 3}
CI = re.compile(r"^[A-Z][A-Za-z]{0,2}\d")


def stars(s):
    return s.count("★"), s.count("★") + s.count("☆")


def star_lf(filled, total):
    f = filled / total
    return 1 if f == 1 else 2 if f >= .75 else 3 if f >= .5 else 4


def lightfastness(p, scale):
    """(lf, lfRaw) from the brand's rating and ASTM; scale = the brand's star-scale size."""
    raw, astm = (p.get("lightfastness") or "").strip(), (p.get("astm") or "").strip()
    astm = astm if astm in ROMAN else ""
    lf, shown = None, raw
    if "★" in raw or "☆" in raw:
        n, t = stars(raw)
        lf = star_lf(n, max(t, scale)) if raw.count("☆") == 0 else star_lf(n, t)
    elif raw in LETTER:
        lf = LETTER[raw]
    elif raw in WORD:
        lf, shown = WORD[raw]
    elif raw in ROMAN:
        lf = ROMAN[raw]
    elif re.fullmatch(r"\d(-\d)?", raw):
        bw = int(raw.split("-")[-1])
        lf, shown = (1 if bw >= 7 else 2 if bw == 6 else 3 if bw >= 4 else 4), "Blue Wool " + raw
    if astm:
        lf = ROMAN[astm]
    parts = [s for s in (shown if lf or astm else raw, "ASTM " + astm if astm else "") if s]
    return lf, ", ".join(parts) or None


def drying(v):
    """fast / medium / slow from words ("Very fast", "Average") or day ranges ("2-7 days")."""
    if not v:
        return None
    w = v.lower()
    m = re.fullmatch(r"(\d+)(?:-(\d+))? days?", w)
    if m:
        d = int(m.group(2) or m.group(1))
        return "fast" if d <= 2 else "medium" if d <= 7 else "slow"
    if "fast" in w:
        return "fast"
    if w in ("medium", "average"):
        return "medium"
    if "slow" in w:
        return "slow"
    return None


def convert(p, bkey, scale, medium):
    q = {"brand": bkey, "name": p["name"].strip(), "L": p["L"], "a": p["a"], "b": p["b"]}
    if p.get("single_pigment") is not None:
        q["single"] = bool(p["single_pigment"])
    lf, lf_raw = lightfastness(p, scale)
    if lf:
        q["lf"] = lf
    if lf_raw:
        q["lfRaw"] = lf_raw
    if medium == "watercolor":
        if p.get("staining") in STAIN:
            q["stain"] = STAIN[p["staining"]]
        if p.get("granulation") in ("G", "SG", "GS"):
            q["gran"] = "G"
        elif p.get("granulation") == "NG":
            q["gran"] = "N"
    if p.get("transparency") in TRANS:
        q["trans"] = TRANS[p["transparency"]]
    if p.get("series"):
        q["series"] = re.sub(r"^Series\s+", "", p["series"]).strip()
    pig = [c for c in p.get("pigments") or [] if CI.match(c)]
    if pig:
        q["pig"] = pig
    if p.get("discontinued"):
        q["disc"] = True
    m = (p.get("measurement") or "").lower()
    if m.startswith("chart"):
        q["src"] = "chart"
    elif m.startswith("manufacturer"):
        q["src"] = "maker"
    dry = (p.get("extra") or {}).get("drying_time")
    if drying(dry):
        q["dry"], q["dryRaw"] = drying(dry), dry
    if p.get("url"):
        q["url"] = p["url"]
    return q


def brand_scale(paints):
    return max([stars(p.get("lightfastness") or "")[1] for p in paints] + [0])


def with_ids(paints, bkey):
    """id = brand:name, with the maker's code added when a brand lists one name twice."""
    seen = {}
    for q, p in paints:
        i = f"{bkey}:{q['name']}"
        if i in seen:
            i = f"{i} ({p.get('code') or len(seen)})"
        seen[i] = 1
        yield {"id": i, **q}


def write(path, head, paints):
    path.write_text(DUMP(head)[:-1] + ',"paints":[' + ",\n".join(DUMP(p) for p in paints) + "]}")


def opaque(src):
    doc = json.loads(Path(src).read_text())
    for medium, brands in doc["media"].items():
        out_brands, out = [], []
        for bkey, b in brands.items():
            out_brands.append({"key": bkey, "name": b["name"], "short": SHORT.get(bkey, b["name"]), "url": b["url"]})
            scale = brand_scale(b["paints"])
            out += with_ids([(convert(p, bkey, scale, medium), p) for p in b["paints"]], bkey)
        notes = [n for n in doc["notes"] if not n.startswith(("extra holds", "pigments ="))] + [
            "lf is lightfastness normalized to 1 (best) - 4 (poor) across brand scales; lfRaw is the brand's own rating.",
            "trans: T, ST, SO, O. pig: Colour Index codes. src: chart (printed chart) or maker (manufacturer data).",
        ] + (["dry: fast, medium or slow, grouped from each brand's drying time (dryRaw)."] if medium == "oil" else [])
        head = {k: doc[k] for k in ("attribution", "license", "retrieved")} | {"medium": medium, "notes": notes, "brands": out_brands}
        write(DATA / f"{medium}.json", head, out)
        print(medium, len(out), "paints,", len(out_brands), "brands")


def norm(n):
    return re.sub(r"[.’']", "", n).lower()


def daniel_smith(src):
    doc = json.loads(Path(src).read_text())
    (b,) = doc["brands"].values()
    path = DATA / "paints.json"
    cur = json.loads(path.read_text())
    old = [p for p in cur["paints"] if p["brand"] == "ds"]
    by_name = {norm(p["name"]): p for p in old}
    scale = brand_scale(b["paints"])
    new, used = [], set()
    for p in b["paints"]:
        q = convert(p, "ds", scale, "watercolor")
        prev = by_name.get(norm(q["name"]))
        # keep the id a saved palette already uses, even where the name's punctuation changed
        q = {"id": prev["id"] if prev else f"ds:{q['name']}", **q}
        if prev:
            used.add(prev["id"])
        new.append(q)
    # paints the export doesn't have (colors from the maker, not yet measured by the site) stay
    kept = [p for p in old if p["id"] not in used]
    # Daniel Smith only marks granulating paints, so an unmarked one isn't a stated "N"
    for p in kept:
        if p.get("gran") == "N" and p.get("granSrc") in (None, "brand"):
            p.pop("gran"); p.pop("granSrc", None)
    first = next(i for i, p in enumerate(cur["paints"]) if p["brand"] == "ds")
    rest = [p for p in cur["paints"] if p["brand"] != "ds"]
    cur["paints"] = rest[:first] + new + kept + rest[first:]
    head = {k: v for k, v in cur.items() if k != "paints"}
    write(path, head, cur["paints"])
    print("ds", len(new), "from the export,", len(kept), "kept:", ", ".join(p["name"] for p in kept))


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("ds", "opaque"):
        sys.exit(__doc__)
    (daniel_smith if sys.argv[1] == "ds" else opaque)(sys.argv[2])
