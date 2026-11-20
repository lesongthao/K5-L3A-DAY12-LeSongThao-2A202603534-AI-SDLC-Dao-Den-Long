import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {run,ok,named,last} from './helpers.mjs';
const cases=JSON.parse(readFileSync('tests/scenarios/features.json','utf8'));
for(const c of cases)test(`saved scenario: ${c.name}`,()=>{
  const r=ok(run(c));if(c.event)assert.ok(named(r,c.event).length>0);
  if(c.wind)assert.equal(last(r).wind.active,true);
  if(c.landed)assert.ok(last(r).player.grounded&&last(r).player.pos[0]>40);
});
