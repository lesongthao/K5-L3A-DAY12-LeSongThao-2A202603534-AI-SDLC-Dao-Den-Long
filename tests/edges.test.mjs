import test from 'node:test';
import assert from 'node:assert/strict';
import {run,ok,quiet,last,named,close} from './helpers.mjs';
const scene=x=>({...quiet,...x});
test('pulse uses full3D distance from feet+0.8, not XZ only',()=>{
  const r=ok(run({scenario:scene({player:{carried:3},shades:[
    {id:'HIGH',pos:[0,6,0]},{id:'EDGE',pos:[0,5.8,0]}]}),frames:[{tick:0,pulse:true}]}));
  assert.deepEqual(named(r,'pulse')[0].data.stunned_ids,['EDGE']);
});
test('safe edge blocks exactly at6m and newly-lit inside shade ejects by30ticks',()=>{
  const r=ok(run({ticks:30,scenario:scene({player:{carried:10},shades:[{id:'S',pos:[0,0.8,0]}],
    lanterns:[{id:'L1',pos:[0,0,0]}]}),frames:[{tick:0,interact:true}]}));
  assert.equal(named(r,'player_hit').length,0);assert.ok(last(r).shades[0].pos[0]>=6-0.002);
  const block=ok(run({ticks:120,scenario:scene({shades:[{pos:[10,0.8,0]}],
    lanterns:[{id:'L1',pos:[0,0,0],lit:true}]})}));
  close(last(block).shades[0].pos[0],6,0.002);
});
test('pulse still pushes during safe ejection within its first15ticks',()=>{
  const r=ok(run({ticks:15,scenario:scene({player:{carried:3},shades:[{id:'S',pos:[1,0.8,0]}],
    lanterns:[{id:'L1',pos:[0,0,0],lit:true}]}),frames:[{tick:0,pulse:true}]}));
  assert.ok(last(r).shades[0].pos[0]>=5);assert.equal(named(r,'player_hit').length,0);
});
test('supplied and automatic IDs cannot collide; same inputs remain deterministic',()=>{
  const r=ok(run({ticks:0,scenario:scene({shades:[{pos:[20,0.8,0]},{id:'S1',pos:[-20,0.8,0]}]})}));
  assert.equal(new Set(last(r).shades.map(x=>x.id)).size,2);
});
test('ramp can be climbed, terrace wall cannot be walked through',()=>{
  const a=Math.PI/6;
  const ramp=ok(run({night:3,ticks:65,scenario:scene({player:{pos:[30*Math.cos(a),0,30*Math.sin(a)]}}),
    frames:[{tick:0,move:[-Math.cos(a),-Math.sin(a)]}]}));
  close(last(ramp).player.pos[1],3,0.03);
  const wall=ok(run({night:3,ticks:80,scenario:scene({player:{pos:[0,0,26]}}),frames:[{tick:0,move:[0,-1]}]}));
  assert.ok(last(wall).player.pos[2]>=24);close(last(wall).player.pos[1],0);
});
test('night2 launch lands on destination and night3 pad lands on layer2',()=>{
  const r=ok(run({night:2,ticks:100,scenario:scene({player:{pos:[20,0,18]}})}));
  assert.equal(last(r).player.grounded,true);close(last(r).player.pos[1],0);
  assert.ok(Math.hypot(last(r).player.pos[0]-70,last(r).player.pos[2])<=28);
  const n3=ok(run({night:3,ticks:80,scenario:scene({player:{pos:[0,3,13]}})}));
  close(last(n3).player.pos[1],6);assert.equal(last(n3).player.grounded,true);
});
test('TTL and charm respawn freeze while paused, then expire on simulated ticks',()=>{
  const r=ok(run({ticks:65,scenario:scene({motes:[{pos:[4,0,0],kind:'dropped',ttl_s:0.5}],
    charms:[{id:'C1',pos:[5,0,0],available:false,respawn_ticks:30}]}),
    frames:[{tick:10,pause:true},{tick:20,pause:false},{tick:40,pause:true}]}));
  assert.equal(r.snapshots.find(s=>s.tick===40).motes[0].ttl_s,20/60);
  assert.equal(last(r).motes.length,0);assert.equal(last(r).charms[0].available,true);
});
test('shade contact order follows numeric generated IDs S2 before S10',()=>{
  const r=ok(run({scenario:scene({shades:[{id:'S10',pos:[0,0.8,0]},{id:'S2',pos:[0,0.8,0]}]})}));
  assert.equal(last(r).shades.find(s=>s.id==='S2').state,'recoil');
  assert.notEqual(last(r).shades.find(s=>s.id==='S10').state,'recoil');
});
test('pulse-returned drifter remains120ticks after activation, not119',()=>{
  const r=ok(run({night:2,ticks:121,scenario:scene({player:{carried:3},
    drifters:[{id:'D1',pos:[1,0.8,0],state:'flee',stolen:2}]}),frames:[{tick:0,pulse:true}]}));
  assert.equal(r.snapshots.find(s=>s.tick===120).drifters.length,1);
  assert.equal(r.snapshots.find(s=>s.tick===121).drifters.length,0);
});
