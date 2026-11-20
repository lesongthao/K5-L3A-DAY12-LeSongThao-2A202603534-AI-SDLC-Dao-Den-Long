import test from 'node:test';
import assert from 'node:assert/strict';
import { run, ok, quiet, last, named, close } from './helpers.mjs';
const scene=extra=>({...quiet,...extra});

test('v1.1 maps and required snapshots have 5/6/7 lamps and all arrays',()=>{
  for(const night of [1,2,3]){
    const r=ok(run({night,ticks:0})),s=last(r);
    assert.equal(s.night,night);assert.equal(s.lanterns.length,night+4);
    for(const field of ['motes','drifters','charms'])assert.ok(Array.isArray(s[field]));
    assert.deepEqual(s.wind,{active:false,dir_deg:0});
    for(const field of ['vel','grounded','invuln','dash_cd_s','pulse_cd_s','charm_s'])assert.ok(field in s.player);
  }
});
test('20 unique motes at startup; first shades at tick300, not before',()=>{
  const start=ok(run({scenario:{random_shades:false},ticks:0}));
  assert.equal(last(start).motes_active,20);
  assert.equal(new Set(last(start).motes.map(m=>m.pos.join(','))).size,20);
  const r=ok(run({scenario:{random_motes:false},ticks:300}));
  assert.equal(r.snapshots.find(s=>s.tick===299).shades.length,0);
  assert.equal(last(r).shades.length,2);assert.equal(named(r,'shade_spawned').length,2);
  assert.deepEqual(named(r,'shade_spawned').map(e=>e.tick),[300,300]);
});
test('dash travels 2.8m in12 ticks, then normal movement; cooldown from start',()=>{
  const r=ok(run({ticks:13,frames:[{tick:0,move:[0,1],dash:true}]}));
  close(r.snapshots.find(s=>s.tick===12).player.pos[2],2.8);
  close(last(r).player.pos[2],2.9);close(last(r).player.dash_cd_s,78/60);
  assert.equal(named(r,'dash').length,1);
});
test('air dash holds altitude and does not grant invulnerability',()=>{
  const r=ok(run({ticks:12,scenario:scene({player:{pos:[0,3,0]}}),frames:[{tick:0,dash:true}]}));
  close(last(r).player.pos[1],3);assert.equal(last(r).player.invuln,false);
});
test('pause freezes sim time/cooldown and held pause is not toggled repeatedly',()=>{
  const r=ok(run({ticks:30,scenario:scene({player:{pulse_cd_ticks:100}}),frames:[
    {tick:0,move:[0,1]},{tick:5,pause:true},{tick:20,pause:false},{tick:25,pause:true}]}));
  const a=r.snapshots.find(s=>s.tick===6),b=r.snapshots.find(s=>s.tick===25);
  assert.equal(a.state,'paused');assert.equal(a.sim_tick,5);assert.equal(b.sim_tick,5);
  assert.deepEqual(a.player,b.player);assert.equal(a.time_left_s,b.time_left_s);
  assert.equal(last(r).sim_tick,10);assert.equal(last(r).tick,30);
  assert.equal(named(r,'paused').length,1);assert.equal(named(r,'resumed').length,1);
});
test('fall ignores invulnerability, loses all carried, penalizes once and respawns after60',()=>{
  const r=ok(run({ticks:61,scenario:scene({player:{pos:[42,-11,0],carried:7,invuln_ticks:100}})}));
  assert.equal(named(r,'player_hit').length,1);
  assert.deepEqual(named(r,'player_hit')[0].data,{by:'fall',flames:2,dropped:0,lost:7});
  assert.deepEqual(last(r).player.pos,[0,0,0]);assert.equal(last(r).player.invuln,true);
});
test('no_flames has precedence over all_lit in same tick',()=>{
  const r=ok(run({scenario:scene({player:{pos:[50,-11,0],flames:1},
    lanterns:Array.from({length:5},(_,i)=>({id:`L${i+1}`,lit:true}))})}));
  assert.equal(r.end.state,'lost');assert.equal(named(r,'game_over')[0].data.reason,'no_flames');
});
test('shade hit drops floor(carried/2), TTL480, not collectible during birth tick',()=>{
  const r=ok(run({scenario:scene({player:{carried:9},shades:[{id:'S1',pos:[0,0.8,0]}]})}));
  assert.equal(last(r).player.carried,5);const drops=last(r).motes;
  assert.equal(drops.length,4);
  for(const m of drops){assert.equal(m.kind,'dropped');assert.equal(m.ttl_s,8);
    const radius=Math.hypot(m.pos[0],m.pos[2]);assert.ok(radius>=1.499&&radius<=2.501);}
});
test('charm makes run7.2 and dash immediately reusable after12ticks; respawns2700',()=>{
  const r=ok(run({night:2,ticks:30,scenario:scene({charms:[{id:'C1',pos:[0,0,0]}]}),frames:[
    {tick:1,move:[0,1],dash:true},{tick:2,dash:false},{tick:13,dash:true}]}));
  assert.equal(named(r,'charm_picked').length,1);assert.equal(named(r,'dash').length,2);
  assert.equal(last(r).player.dash_cd_s,0);assert.equal(last(r).charms[0].available,false);
  close(last(r).charms[0].respawn_s,(2700-29)/60);
  const speed=ok(run({night:2,ticks:60,scenario:scene({player:{charm_ticks:600}}),frames:[{tick:0,move:[0,1]}]}));
  close(last(speed).player.pos[2],7.2);
});
test('drifter steals despite invulnerability, then pulse drops stolen motes',()=>{
  const r=ok(run({night:2,ticks:2,scenario:scene({player:{carried:10,invuln_ticks:90},
    drifters:[{id:'D1',pos:[0,0.8,0],state:'chase'}]}),frames:[{tick:1,pulse:true}]}));
  assert.equal(named(r,'drifter_steal').length,1);
  assert.deepEqual(named(r,'drifter_steal')[0].data,{drifter_id:'D1',amount:3,carried:7});
  assert.equal(named(r,'drifter_drop')[0].data.amount,3);assert.equal(last(r).player.flames,3);
  assert.equal(last(r).motes.filter(m=>m.kind==='dropped').length,3);
});
test('drifter spawns tick1200 and wind active tick1800 with warning before',()=>{
  const d=ok(run({night:2,ticks:1200,scenario:scene({random_drifters:true})}));
  assert.equal(last(d).drifters.length,1);assert.equal(last(d).drifters[0].id,'D1');
  const w=ok(run({night:3,ticks:1800,scenario:scene({wind_enabled:true})}));
  assert.equal(w.snapshots.find(s=>s.tick===1799).wind.active,false);assert.equal(last(w).wind.active,true);
});
test('jump pad launch preserves horizontal velocity across input changes',()=>{
  const r=ok(run({night:2,ticks:30,scenario:scene({player:{pos:[20,0,18]}}),frames:[{tick:1,move:[-1,0]}]}));
  assert.ok(last(r).player.pos[0]>25);assert.ok(last(r).player.pos[1]>0);
  close(Math.hypot(last(r).player.vel[0],last(r).player.vel[2]),24);
});
test('whole night3 CPU-only 18000 steps completes in less than30 seconds',()=>{
  const before=performance.now();const r=ok(run({night:3,ticks:18000,every:60,scenario:quiet}));
  assert.equal(r.end.ticks,18000);assert.equal(r.end.state,'lost');
  assert.ok(performance.now()-before<30000);
});
