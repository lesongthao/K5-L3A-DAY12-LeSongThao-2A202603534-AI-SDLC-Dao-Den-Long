import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
export function fingerprint(){
  const files=['game.contract.json','package.json','package-lock.json','index.html','tsconfig.json','tsconfig.node.json','vite.config.ts'];
  function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
    const file=join(dir,entry.name);if(entry.isDirectory())walk(file);else files.push(file);
  }}
  for(const root of ['src','scripts','tests'])walk(root);
  const hash=createHash('sha256');
  for(const file of files.sort())hash.update(file.replaceAll('\\','/')).update('\0').update(readFileSync(file)).update('\0');
  return hash.digest('hex');
}
