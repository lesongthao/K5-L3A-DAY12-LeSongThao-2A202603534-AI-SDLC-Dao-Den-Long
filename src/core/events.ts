import type { GameEvent, GameState } from './types.js';
export function emit(s: GameState, events: GameEvent[], name: string, data: Record<string,unknown> = {}): void {
  events.push({type:'event',tick:s.tick,name,data});
}
