import type { GameState, GameEvent, Vec3 } from './types.js';
import { distXZ } from './math.js';
import { emit } from './events.js';
import { nextId, shadeAt } from './world.js';

export function updateWind(s:GameState):void {
  const t=s.tuning;
  if (s.night!==3 || !s.windEnabled) {s.wind.active=false;s.wind.warning=false;return;}
  const phase=s.simTick%t.wind_interval_ticks;
  if (phase===t.wind_interval_ticks-t.wind_warning_ticks) s.wind.dir_deg=s.rng()*360;
  s.wind.warning=phase>=t.wind_interval_ticks-t.wind_warning_ticks;
  s.wind.active=s.simTick>=t.wind_interval_ticks && phase<t.wind_duration_ticks;
}
export function spawnEntities(s:GameState,events:GameEvent[]):void {
  const t=s.tuning;
  if (s.randomMotes && s.simTick%t.mote_spawn_ticks===0 && s.motes.length<t.mote_cap) {
    const free=s.map.motePoints.filter(p=>!s.motes.some(m=>distXZ(m.pos,p)<0.01 && Math.abs(m.pos[1]-p[1])<0.01));
    if (free.length) {
      const pos:Vec3=[...free[Math.floor(s.rng()*free.length)]];
      s.motes.push({id:nextId(s,'M'),pos,kind:'random',ttl:null,born:s.simTick});
    }
  }
  const interval=t.shade_spawn_ticks[s.night-1];
  if (s.randomShades && s.simTick>=t.shade_first_tick && (s.simTick-t.shade_first_tick)%interval===0) {
    const count=s.simTick===t.shade_first_tick?2:1;
    for (let i=0;i<count && s.shades.length<t.shade_caps[s.night-1];i++) {
      const free=s.map.shadePoints.filter(p=>distXZ(p,s.player.pos)>=15 &&
        !s.lanterns.some(l=>l.lit && distXZ(p,l.pos)<=t.safe_radius) &&
        !s.shades.some(sh=>distXZ(sh.pos,p)<1));
      if (!free.length) break;
      const pos:Vec3=[...free[Math.floor(s.rng()*free.length)]];pos[1]+=0.8;
      const sh=shadeAt(nextId(s,'S'),pos);sh.state='spawning';sh.timer=1;s.shades.push(sh);
      emit(s,events,'shade_spawned',{id:sh.id});
    }
  }
  if (s.night>1 && s.randomDrifters && s.simTick%t.drifter_spawn_ticks===0 && s.drifters.length<t.drifter_cap) {
    const pos:Vec3=[...s.map.shadePoints[Math.floor(s.rng()*s.map.shadePoints.length)]];pos[1]+=0.8;
    s.drifters.push({id:nextId(s,'D'),pos,state:'idle',stolen:0,timer:0,dir:[1,0],started:-1});
  }
}
