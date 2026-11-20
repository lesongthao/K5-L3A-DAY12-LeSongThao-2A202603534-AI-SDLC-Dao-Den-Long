export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export type Night = 1 | 2 | 3;
export type Status = 'playing' | 'paused' | 'won' | 'lost';
export type ShadeMode = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned' | 'drain';

export interface Tuning {
  player_speed: number; carry_capacity: number; capacity_max: number;
  lantern_cost: number; relight_cost: number; fuel_max: number;
  fuel_decay_per_s: number; fuel_per_mote: number; win_ratio: number;
  drain_per_s: number; low_fuel_threshold: number;
  lantern_count_night1: number; pickup_radius: number; interact_radius: number;
  pulse_cost: number; pulse_radius: number; night1_duration_s: number;
  night2_duration_s: number; night3_duration_s: number; flames: number; invuln_s: number;
  hit_drop_ratio: number; pulse_stun_s: number; pulse_push_m: number;
  pulse_cooldown_s: number; safe_radius: number; shade_speed: number;
  shade_hit_radius: number; fall_enabled: boolean;
  dash_speed: number; dash_duration_s: number; dash_cooldown_s: number;
  jump_velocity: number; gravity: number; pickup_height: number;
  shade_speed_night3: number; shade_detect_radius: number; shade_lose_radius: number;
  mote_initial: number; mote_cap: number; mote_spawn_ticks: number;
  shade_first_tick: number; shade_spawn_ticks: number[]; shade_caps: number[];
  pulse_push_ticks: number; safe_eject_ticks: number; recoil_ticks: number; recoil_m: number;
  drop_ttl_ticks: number; respawn_ticks: number; charm_ticks: number;
  charm_respawn_ticks: number; charm_speed: number; drifter_speed: number;
  drifter_idle_speed: number; drifter_spawn_ticks: number; drifter_cap: number;
  drifter_detect_radius: number; drifter_hit_radius: number;
  drifter_flee_ticks: number; drifter_drop_ticks: number;
  wind_interval_ticks: number; wind_duration_ticks: number; wind_warning_ticks: number;
  wind_speed: number;
  score: {
    per_mote: number; per_lantern: number; per_relight: number;
    per_stun: number; per_stun_drain: number; per_flame_left: number;
    per_lit_lantern: number; per_second_left: number;
  };
}

export interface InputState {
  move: Vec2; cam_yaw_deg: number; jump: boolean; interact: boolean;
  pulse: boolean; dash: boolean; pause: boolean;
}
export type Frame = Partial<InputState> & { tick: number };

export interface Player {
  pos: Vec3; vel: Vec3; grounded: boolean; carried: number; flames: number;
  invuln: number; dashCd: number; pulseCd: number; charm: number; respawn: number;
  facing: Vec2; dashDir: Vec2; dashLeft: number; savedVy: number;
  launch: Vec2 | null; padLock: boolean;
  successful_lights: number; capacity: number;
}

export interface Lantern {
  id: string; pos: Vec3; deposited: number; lit: boolean;
  fuelTicks: number; everLit: boolean; relitCount: number;
}

export interface Mote { id: string; pos: Vec3; kind: 'random' | 'dropped'; ttl: number | null; born: number }

export interface Shade {
  id: string; pos: Vec3; state: ShadeMode; timer: number;
  pushDir: Vec2; pushLeft: number; eject: number; ejectDir: Vec2; ejectStep: number;
  targetLanternId?: string; drainTicks?: number;
}

export interface Drifter {
  id: string; pos: Vec3; state: 'idle' | 'chase' | 'flee' | 'removed';
  stolen: number; timer: number; dir: Vec2; started: number;
}

export interface Charm { id: string; pos: Vec3; available: boolean; respawn: number }
export interface Pad { pos: Vec3; radius: number; vy: number; velocity: Vec2 }

export interface MapData {
  name: string; subtitle: string; lanterns: Vec3[]; motePoints: Vec3[];
  shadePoints: Vec3[]; charms: Vec3[]; pads: Pad[];
}

export interface Scenario {
  player?: {
    pos?: Vec3; carried?: number; flames?: number; vel?: Vec3;
    invuln_ticks?: number; dash_cd_ticks?: number; pulse_cd_ticks?: number;
    charm_ticks?: number; successful_lights?: number;
  };
  random_motes?: boolean; random_shades?: boolean; random_drifters?: boolean;
  wind_enabled?: boolean; time_left_s?: number;
  motes?: (Vec3 | { id?: string; pos: Vec3; kind?: 'random' | 'dropped'; ttl_s?: number | null })[];
  shades?: { id?: string; pos: Vec3; state?: ShadeMode; state_ticks_left?: number; target_lantern_id?: string }[];
  lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean; fuel?: number; ever_lit?: boolean; relit_count?: number }[];
  drifters?: { id?: string; pos: Vec3; state?: Drifter['state']; stolen?: number; state_ticks_left?: number }[];
  charms?: { id?: string; pos?: Vec3; available?: boolean; respawn_ticks?: number; respawn_s?: number }[];
}

export interface GameState {
  night: Night; tick: number; simTick: number; state: Status; score: number;
  initialTime: number; timeLeft: number; tuning: Tuning; map: MapData;
  player: Player; lanterns: Lantern[]; motes: Mote[]; shades: Shade[];
  drifters: Drifter[]; charms: Charm[]; rng: () => number;
  ids: { M: number; S: number; D: number }; reservedIds: Set<string>; lastInput: InputState;
  randomMotes: boolean; randomShades: boolean; randomDrifters: boolean;
  windEnabled: boolean; wind: { active: boolean; dir_deg: number; warning: boolean };
}

export interface GameEvent { type: 'event'; tick: number; name: string; data: Record<string, unknown> }
export const emptyInput = (): InputState => ({
  move: [0, 0], cam_yaw_deg: 0,
  jump: false, interact: false, pulse: false, dash: false, pause: false
});
