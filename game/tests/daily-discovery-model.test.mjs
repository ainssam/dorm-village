import test from 'node:test';
import assert from 'node:assert/strict';
import {seoulDay, shiftDay, discoveryForDay, archiveDays} from '../dist/village/daily-discovery-model.js';
test('Seoul calendar changes at 15:00 UTC, independent of local timezone',()=>{
 assert.equal(seoulDay(Date.parse('2024-12-31T14:59:59Z')),'2024-12-31');
 assert.equal(seoulDay(Date.parse('2024-12-31T15:00:00Z')),'2025-01-01');
});
test('calendar arithmetic crosses leap days and years',()=>{
 assert.equal(shiftDay('2024-03-01',-1),'2024-02-29');
 assert.equal(shiftDay('2025-01-01',-1),'2024-12-31');
});
test('rotation is deterministic, advances daily and repeats after the deck',()=>{
 const cards=Array.from({length:60},(_,id)=>({id}));
 const first=discoveryForDay('2024-02-29',cards);
 assert.deepEqual(discoveryForDay('2024-02-29',cards),first);
 assert.notDeepEqual(discoveryForDay('2024-03-01',cards),first);
 assert.deepEqual(discoveryForDay(shiftDay('2024-02-29',60),cards),first);
});
test('archive includes today and the six previous dates only',()=>{
 assert.deepEqual(archiveDays('2025-01-02'),['2025-01-02','2025-01-01','2024-12-31','2024-12-30','2024-12-29','2024-12-28','2024-12-27']);
});
