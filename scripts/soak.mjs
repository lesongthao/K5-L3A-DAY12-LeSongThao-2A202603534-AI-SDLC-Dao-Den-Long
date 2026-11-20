import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createGame, step } from '../dist/node/core/game.js';
import { seeded } from '../dist/node/core/math.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let seed = 7, nights = 10, out = 'soak.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) seed = parseInt(args[++i], 10);
    else if (args[i] === '--nights' && args[i + 1]) nights = parseInt(args[++i], 10);
    else if (args[i] === '--out' && args[i + 1]) out = args[++i];
  }
  return { seed, nights, out };
}

const { seed, nights, out } = parseArgs();
const contract = JSON.parse(readFileSync(resolve('game.contract.json'), 'utf8'));
const tuning = contract.tuning;
const results = [];
let crashes = 0;
const startTimer = performance.now();

let memStartMb = 0;

for (let i = 0; i < nights; i++) {
  const nightNumber = ((i % 3) + 1);
  const nightSeed = seed + i;
  const rng = seeded(nightSeed);

  try {
    let game = createGame({ seed: nightSeed, night: nightNumber, tuning });
    if (i === 0) {
      memStartMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    }

    const maxTicks = [tuning.night1_duration_s, tuning.night2_duration_s, tuning.night3_duration_s][nightNumber - 1] * 60;
    let moveDir = [0, 0];

    for (let tick = 0; tick < maxTicks; tick++) {
      if (tick % 30 === 0) {
        const angle = rng() * Math.PI * 2;
        moveDir = [Math.cos(angle), Math.sin(angle)];
      }

      const input = {
        move: moveDir,
        cam_yaw_deg: 0,
        jump: rng() < 0.05,
        dash: rng() < 0.03,
        pulse: rng() < 0.02,
        interact: rng() < 0.10,
        pause: false
      };

      const out = step(game, input);
      game = out.state;

      if (game.state === 'won' || game.state === 'lost') {
        break;
      }
    }

    results.push(game.state);
  } catch (err) {
    crashes++;
    results.push('crash');
    console.error(`Crash on night ${i + 1}:`, err);
  }
}

// Force GC if available or record final RSS
const memEndMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
const durationS = Math.round((performance.now() - startTimer) / 100) / 10;

const outputData = {
  nights,
  crashes,
  results,
  mem_start_mb: memStartMb,
  mem_end_mb: memEndMb,
  duration_s: durationS
};

writeFileSync(resolve(out), JSON.stringify(outputData, null, 2) + '\n');
console.log(JSON.stringify(outputData, null, 2));

if (crashes > 0) {
  process.exit(1);
}
