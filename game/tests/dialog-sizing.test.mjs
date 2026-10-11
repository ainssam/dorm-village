import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('shared choice dialogs use compact readable type without reducing touch targets',()=>{
 const css=fs.readFileSync('dist/style.css','utf8');
 assert.match(css,/dialog\{font-size:16px;width:480px/);
 assert.match(css,/dialog h2\{font-size:22px/);
 assert.match(css,/dialog p[^}]*font-size:16px/);
 assert.match(css,/button,select\{min-height:48px\}/);
 assert.match(css,/\.elevator-choices button\{min-height:64px/);
 assert.match(css,/\.elevator-choices strong\{font-size:20px\}/);
 assert.match(css,/\.subject-choices button\{min-height:52px;font:inherit;font-size:16px/);
});
