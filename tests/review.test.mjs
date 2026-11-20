import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../dist/node/core/world.js';
import {contract,run,ok,quiet,last} from './helpers.mjs';
test('duplicate explicit mote IDs return format error2',()=>{
  const r=run({scenario:{...quiet,motes:[{id:'M1',pos:[0,0,0]},{id:'M1',pos:[5,0,0]}]}});
  assert.equal(r.status,2);
});
test('explicit charm C2 does not collide with unnamed charm',()=>{
  const r=ok(run({night:3,ticks:0,scenario:{...quiet,charms:[{id:'C2',pos:[30,0,25]},{pos:[-30,0,25]}]}}));
  assert.equal(new Set(last(r).charms.map(c=>c.id)).size,2);
});
test('arbitrarily large explicit ID cannot overflow the automatic counter',()=>{
  const r=ok(run({ticks:0,scenario:{...quiet,motes:[{id:'M9007199254740992',pos:[3,0,0]},[5,0,0]]}}));
  assert.equal(new Set(last(r).motes.map(m=>m.id)).size,2);
});
test('array enums are invalid for motes, shades and drifters',()=>{
  for(const scenario of [{motes:[{pos:[0,0,0],kind:['dropped']}]},
    {shades:[{pos:[0,0,0],state:['wander']}]},{drifters:[{pos:[0,0,0],state:['idle']}]}]){
    assert.equal(run({scenario:{...quiet,...scenario}}).status,2);
  }
});
test('scenario default TTL and stun derive only from actual tuning',()=>{
  const tuning={...contract.tuning,drop_ttl_ticks:60,pulse_stun_s:1};
  const s=createGame({seed:1,night:1,tuning,scenario:{...quiet,
    motes:[{pos:[5,0,0],kind:'dropped'}],shades:[{pos:[10,0.8,0],state:'stunned'}]}});
  assert.equal(s.motes[0].ttl,60);assert.equal(s.shades[0].timer,60);
});
