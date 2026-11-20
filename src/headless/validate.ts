import type { Frame, Scenario, Vec3 } from '../core/types.js';
export class FormatError extends Error {}
const fail=(message:string):never=>{throw new FormatError(message);};
const obj=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail('Phải là object JSON');
const number=(v:unknown):number=>typeof v==='number'&&Number.isFinite(v)?v:fail('Số phải hữu hạn');
const nonnegative=(v:unknown)=>number(v)>=0?number(v):fail('Số không được âm');
const integer=(v:unknown)=>Number.isSafeInteger(nonnegative(v))?v as number:fail('Phải là số nguyên không âm');
const bool=(v:unknown)=>typeof v==='boolean'?v:fail('Phải là boolean');
function vector(v:unknown,len:number):number[] {
  if (!Array.isArray(v)||v.length!==len) return fail(`Vector phải có ${len} số`);
  return v.map(number);
}
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:fail('Phải là mảng');
const id=(v:unknown)=>typeof v==='string'&&v.length>0?v:fail('ID phải là chuỗi không rỗng');
function fields(o:Record<string,unknown>,keys:string[],check:(v:unknown)=>unknown):void {
  keys.forEach(k=>{if(o[k]!==undefined)check(o[k]);});
}
function uniqueIds(items:unknown[]):void {
  const ids=items.map(x=>obj(x).id).filter(x=>x!==undefined).map(id);
  if(new Set(ids).size!==ids.length)fail('ID không được trùng');
}
export function validateInputs(value:unknown):Frame[] {
  const o=obj(value),frames=array(o.frames);let previous=-1;
  for (const value of frames) {
    const f=obj(value),tick=integer(f.tick);
    if(tick<=previous)fail('Tick frame phải tăng nghiêm ngặt');previous=tick;
    if(f.move!==undefined)vector(f.move,2).forEach(n=>{if(Math.abs(n)>1)fail('Move ngoài [-1,1]');});
    fields(f,['cam_yaw_deg'],number);fields(f,['jump','interact','pulse','dash','pause'],bool);
  }
  return frames as Frame[];
}
export function validateScenario(value:unknown,night:number):Scenario {
  const s=obj(value);
  fields(s,['random_motes','random_shades','random_drifters','wind_enabled'],bool);
  fields(s,['time_left_s'],nonnegative);
  if(s.player!==undefined){
    const p=obj(s.player);
    fields(p,['carried','flames','invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks','successful_lights'],integer);
    if(p.pos!==undefined)vector(p.pos,3);if(p.vel!==undefined)vector(p.vel,3);
  }
  if(s.motes!==undefined) {
    const ms=array(s.motes);uniqueIds(ms.filter(m=>!Array.isArray(m)));
    for(const m of ms) {
      if(Array.isArray(m)){vector(m,3);continue;}
      const o=obj(m);vector(o.pos,3);if(o.id!==undefined)id(o.id);
      if(o.kind!==undefined&&(typeof o.kind!=='string'||!['random','dropped'].includes(o.kind)))fail('Mote kind không hợp lệ');
      if(o.ttl_s!==undefined&&o.ttl_s!==null)nonnegative(o.ttl_s);
    }
  }
  if(s.shades!==undefined) {
    const shades=array(s.shades);uniqueIds(shades);
    for(const v of shades){
      const o=obj(v);vector(o.pos,3);fields(o,['state_ticks_left'],integer);
      if(o.target_lantern_id!==undefined)id(o.target_lantern_id);
      if(o.state!==undefined&&(typeof o.state!=='string'||!['spawning','wander','chase','recoil','stunned','drain'].includes(o.state)))fail('Shade state không hợp lệ');
    }
  }
  if(s.lanterns!==undefined){
    const ls=array(s.lanterns);uniqueIds(ls);
    for(const v of ls){
      const o=obj(v);const match=/^L([1-9]\d*)$/.exec(id(o.id));
      if(!match||Number(match[1])>night+4)fail('Lantern ID không thuộc đêm');
      fields(o,['deposited','relit_count'],integer);
      fields(o,['lit','ever_lit'],bool);
      fields(o,['fuel'],nonnegative);
      if(o.pos!==undefined)vector(o.pos,3);
    }
  }
  if(s.drifters!==undefined){
    const ds=array(s.drifters);uniqueIds(ds);
    for(const v of ds){
      const o=obj(v);vector(o.pos,3);fields(o,['stolen','state_ticks_left'],integer);
      if(o.state!==undefined&&(typeof o.state!=='string'||!['idle','chase','flee','removed'].includes(o.state)))fail('Drifter state không hợp lệ');
    }
  }
  if(s.charms!==undefined){
    const cs=array(s.charms);uniqueIds(cs);
    for(const v of cs){
      const o=obj(v);if(o.pos!==undefined)vector(o.pos,3);
      fields(o,['available'],bool);fields(o,['respawn_ticks'],integer);fields(o,['respawn_s'],nonnegative);
    }
  }
  return s as Scenario;
}
export function parseJson(source:string):unknown {
  try{return JSON.parse(source.replace(/^\uFEFF/,''));}catch{throw new FormatError('JSON không hợp lệ');}
}
