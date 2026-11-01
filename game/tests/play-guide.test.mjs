import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROOMS} from '../dist/world/rooms.js';
import {GUIDE_STARTS,guidePlaces,guideQueryMatches} from '../dist/play-guide.js';

test('guide searches real activity labels and familiar synonyms without dropping destinations',()=>{
 const places=Object.values(ROOMS);
 assert.ok(guidePlaces(places,{query:'피아노'}).some(r=>r.id==='music'));
 assert.ok(guidePlaces(places,{query:'코딩',hints:{homeStudy:'로봇 공방'}}).some(r=>r.id==='homeStudy'));
 assert.equal(guidePlaces(places,{query:'not-a-village-place'}).length,0);
 assert.ok(guideQueryMatches('도름이  사진','도름이사진'));
 assert.equal(guidePlaces(places).length,places.length);
});
test('optional moods and short starts point to existing reachable rooms',()=>{
 const places=Object.values(ROOMS);
 for(const start of GUIDE_STARTS){const room=ROOMS[start.roomId];assert.ok(room?.spawns[room.mapSpawnId]);assert.ok(guidePlaces(places,{mood:start.mood}).includes(room));}
 assert.ok(guidePlaces(places,{mood:'rest'}).includes(ROOMS.park));
 assert.ok(!guidePlaces(places,{mood:'rest'}).includes(ROOMS.homeStudy));
 assert.deepEqual(guidePlaces(places,{mood:'learn',query:'없는장소'}),[]);
});
