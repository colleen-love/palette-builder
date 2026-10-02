// Palette Builder: start up
// a link to one medium (?medium=oil) preselects it for someone new
const linked=urlMedium();
useMedium(linked||S.medium).then(()=>{const ids=sharedIds();
 // a shared palette skips the first-visit questions; Getting started in the menu still has them
 if(ids&&linked&&cur.key===linked&&P.length){if(!S.onboarded){S.onboarded=true;save();mediumUI()}openShared(ids);return}
 dropShared();if(!S.onboarded)openOnboard()});
