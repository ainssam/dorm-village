import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('activity instructions override clipped ride strips below the map toolbar',()=>{
 const css=fs.readFileSync('dist/hud.css','utf8');
 const marker='body #stage[data-activity-active=true] .activity-note:not([hidden])';
 const start=css.indexOf(marker),rule=css.slice(start,css.indexOf('}',start));
 assert(start>css.lastIndexOf('max-height:68px'));
 assert.match(rule,/top:calc\(max\(16px,env\(safe-area-inset-top\)\) \+ 60px\)/);
 assert.match(rule,/bottom:auto;left:auto/);
 assert.match(rule,/height:auto;max-height:min\(44dvh/);
 assert.match(rule,/overflow:auto/);
 assert.match(css,/\.activity-note #activity-text\{font-size:16px;line-height:1.5;max-height:none;overflow:visible/);
 assert.match(css,/\.activity-note #activity-close\{min-height:48px/);
 assert.match(css,/#stage:has\(#hud-menu\[aria-expanded=true\]\) \.activity-note\{visibility:hidden\}/);
});
