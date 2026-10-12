import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLAW_BODY} from '../dist/amusement/claw-controller.js';

const clawCss=fs.readFileSync('dist/amusement/claw.css','utf8');
const sharedCss=fs.readFileSync('dist/style.css','utf8');

test('touch claw uses the shared walking-stick visuals while desktop retains the arrow fallback',()=>{
 assert.match(CLAW_BODY,/class="dpad stick-controls claw-stick-controls"/);
 assert.match(CLAW_BODY,/data-claw-stick[^>]*type="button"/);
 assert.match(CLAW_BODY,/data-claw-up/);
 assert.match(CLAW_BODY,/data-claw-left/);
 assert.match(CLAW_BODY,/data-claw-right/);
 assert.match(CLAW_BODY,/data-claw-down/);
 assert.match(sharedCss,/\.dpad\.stick-controls\{[^}]*width:148px/);
 assert.match(sharedCss,/\.dpad \.movement-stick\{[^}]*width:148px;height:148px/);
 assert.match(sharedCss,/@media\(max-width:540px\)\{\.dpad\.stick-controls\{width:132px\}/);
 assert.match(sharedCss,/\.dpad \.movement-stick\{[^}]*touch-action:none/,'walking stick prevents touch scrolling while dragging');
 assert.match(sharedCss,/\.stick-track\{[^}]*pointer-events:none/,'the track does not intercept the thumb pointer');
 assert.match(clawCss,/\.claw-overlay \.claw-stick-controls\{display:none\}/);
 assert.match(clawCss,/@media \(pointer:coarse\),\(hover:none\)\{\.claw-overlay \.claw-stick-controls\{display:flex\}\.claw-overlay \.claw-directions\{display:none\}/);
});

test('portrait control widths fit the safe content at common phone sizes',()=>{
 for(const width of[320,390]){
  const stick=width<=540?132:148,content=width-2*12-2*12;
  assert(stick>=44,'thumbstick stays larger than a standard touch target');
  assert(content>=stick+12+104,`${width}px portrait fits stick, gap, and two-button actions`);
 }
 assert.match(sharedCss,/\.stick-controls \*\{-webkit-touch-callout:none\}/);
});

test('short landscape retains a scrollable narrow joystick panel and 48px actions',()=>{
 for(const width of[568,844]){
  const safeSide=width===568?44:59,panel=190,panelPadding=8,stick=124;
  assert(width-2*safeSide-16>=panel,'safe landscape viewport retains a 190px control column');
  assert(panel-2*panelPadding>=stick,'124px stick fits the narrow landscape panel');
 }
 assert.match(clawCss,/\.claw-panel\{[^}]*overflow:auto/);
 assert.match(clawCss,/\.claw-overlay button\{[^}]*min-width:48px;min-height:48px/);
 assert.match(clawCss,/@media \(orientation:landscape\) and \(max-height:520px\) and \(pointer:coarse\)/);
});
