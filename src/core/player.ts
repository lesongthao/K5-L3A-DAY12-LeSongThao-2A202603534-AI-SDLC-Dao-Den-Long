import type { GameState, GameEvent, InputState, Vec3 } from './types.js';
import { DT, distXZ, movement, ticks } from './math.js';
import { blocked, ground, surfaces } from './maps.js';
import { emit } from './events.js';

export function spawnPosition(night: number): Vec3 { return night===3 ? [0,0,-30] : [0,0,0]; }
export function updateCounters(s: GameState): void {
  const p=s.player;
  for (const key of ['invuln','dashCd','pulseCd','charm'] as const) p[key]=Math.max(0,p[key]-1);
  if (p.respawn>0 && --p.respawn===0) {
    p.pos=spawnPosition(s.night); p.vel=[0,0,0]; p.grounded=true;
    p.invuln=ticks(s.tuning.invuln_s); p.launch=null; p.dashLeft=0;
  }
  for (const sh of s.shades) sh.timer=Math.max(0,sh.timer-1);
  for (const c of s.charms) if (!c.available && c.respawn>0 && --c.respawn===0) c.available=true;
  for (const m of s.motes) if (m.ttl!==null) m.ttl--;
  s.motes=s.motes.filter(m=>m.ttl===null || m.ttl>0);
}

export function movePlayer(s: GameState, input: InputState, edges: InputState, events: GameEvent[]): void {
  const p=s.player,t=s.tuning;
  if (p.respawn>0 || p.flames<=0) return;
  const dir=movement(input.move,input.cam_yaw_deg);
  if (Math.hypot(...dir)>1e-8) p.facing=[...dir];
  if (edges.jump && p.grounded && !p.launch) {
    p.vel[1]=t.jump_velocity; p.grounded=false;
  }
  if (edges.dash && p.dashLeft===0 && (p.dashCd===0 || p.charm>0)) {
    const d=Math.hypot(...p.facing);
    p.dashDir=[p.facing[0]/d,p.facing[1]/d]; p.dashLeft=ticks(t.dash_duration_s);
    p.savedVy=p.vel[1]; p.dashCd=p.charm>0 ? 0 : ticks(t.dash_cooldown_s); emit(s,events,'dash');
  }
  const old:Vec3=[...p.pos];
  const dashing=p.dashLeft>0;
  const speed=p.charm>0?t.charm_speed:t.player_speed;
  const horizontal=dashing ? [p.dashDir[0]*t.dash_speed,p.dashDir[1]*t.dash_speed] :
    p.launch ?? [dir[0]*speed,dir[1]*speed];
  p.vel[0]=horizontal[0]; p.vel[2]=horizontal[1];
  if (s.wind.active) {
    const a=s.wind.dir_deg*Math.PI/180; p.vel[0]+=Math.cos(a)*t.wind_speed; p.vel[2]+=Math.sin(a)*t.wind_speed;
  }
  if (dashing) p.vel[1]=0;
  else if (!p.grounded) p.vel[1]+=t.gravity*DT;
  const candidate:Vec3=[p.pos[0]+p.vel[0]*DT,p.pos[1]+p.vel[1]*DT,p.pos[2]+p.vel[2]*DT];
  if (blocked(s.night,old,candidate)) {
    const slideX:Vec3=[candidate[0],candidate[1],old[2]], slideZ:Vec3=[old[0],candidate[1],candidate[2]];
    if (!blocked(s.night,old,slideX)) candidate[2]=old[2];
    else if (!blocked(s.night,old,slideZ)) candidate[0]=old[0];
    else {candidate[0]=old[0];candidate[2]=old[2];}
  }
  p.pos=candidate;
  const h=ground(s.night,p.pos[0],p.pos[2]);
  const landing=surfaces(s.night,p.pos[0],p.pos[2]).find(h=>h<=old[1]+0.26 && p.pos[1]<=h+1e-8);
  if (!dashing && p.vel[1]<=0 && landing!==undefined) {
    p.pos[1]=landing; p.vel[1]=0; p.grounded=true; p.launch=null;
  } else if (p.grounded && Number.isFinite(h) && Math.abs(h-old[1])<=0.26) {
    p.pos[1]=h; p.vel[1]=0;
  } else if (p.pos[1]>h+0.01 || !Number.isFinite(h)) p.grounded=false;
  if (dashing && --p.dashLeft===0) p.vel[1]=p.savedVy;
  const pad=s.map.pads.find(pad=>distXZ(p.pos,pad.pos)<=pad.radius && Math.abs(p.pos[1]-pad.pos[1])<=0.15);
  if (pad && p.grounded && !p.padLock && !dashing) {
    p.vel[1]=pad.vy; p.launch=[...pad.velocity]; p.grounded=false; p.padLock=true;
  }
  if (!pad) p.padLock=false;
  if (t.fall_enabled && p.pos[1]<-10 && p.respawn===0) {
    const lost=p.carried; p.carried=0; p.flames=Math.max(0,p.flames-1);
    p.vel=[0,0,0]; p.dashLeft=0; p.launch=null;
    if (p.flames>0) p.respawn=t.respawn_ticks;
    emit(s,events,'player_hit',{by:'fall',flames:p.flames,dropped:0,lost});
  }
}
