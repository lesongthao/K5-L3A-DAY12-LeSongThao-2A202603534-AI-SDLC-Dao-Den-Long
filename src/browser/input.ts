import { emptyInput } from '../core/types.js';
import type { InputState } from '../core/types.js';

export type ActionName = 'move_up' | 'move_down' | 'move_left' | 'move_right' | 'jump' | 'dash' | 'pulse' | 'interact' | 'pause';

export const ACTION_LABELS: Record<ActionName, string> = {
  move_up: 'Tiến', move_down: 'Lùi', move_left: 'Sang trái', move_right: 'Sang phải',
  jump: 'Nhảy', dash: 'Lướt', pulse: 'Tỏa sáng', interact: 'Nạp / Tương tác', pause: 'Tạm dừng'
};

export const DEFAULT_KEYBINDS: Record<ActionName, string[]> = {
  move_up: ['KeyW', 'ArrowUp'], move_down: ['KeyS', 'ArrowDown'],
  move_left: ['KeyA', 'ArrowLeft'], move_right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], dash: ['ShiftLeft', 'ShiftRight'], pulse: ['KeyQ'],
  interact: ['KeyE'], pause: ['KeyP', 'Escape']
};

const KEYBINDS_STORAGE = 'dao-den-long-keybinds';

export class Controls {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private dragging = false;
  private dragMoved = 0;
  private attackQueued = false;
  private rightHeld = false;
  private rightPressed = false;
  yaw = 0;
  sensitivity = 1;
  keybinds: Record<ActionName, string[]>;

  constructor(canvas: HTMLCanvasElement) {
    this.keybinds = this.loadKeybinds();
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLInputElement && !['checkbox', 'range'].includes(e.target.type)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
      if (!this.held.has(e.code) && !e.repeat) {
        this.pressed.add(e.code);
        if (e.code === 'KeyF') this.attackQueued = true;
      }
      this.held.add(e.code);
    });
    window.addEventListener('keyup', e => this.held.delete(e.code));
    window.addEventListener('blur', () => this.clear());

    canvas.addEventListener('pointerdown', e => {
      if (e.button === 0) {
        this.dragging = true; this.dragMoved = 0;
        try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      } else if (e.button === 2) {
        this.rightHeld = true; this.rightPressed = true;
      }
    });
    canvas.addEventListener('pointerup', e => {
      if (e.button === 0) {
        if (this.dragging && this.dragMoved <= 7) this.attackQueued = true;
        this.dragging = false;
      } else if (e.button === 2) {
        this.rightHeld = false;
      }
    });
    canvas.addEventListener('pointermove', e => {
      if (this.dragging || document.pointerLockElement === canvas) {
        this.dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY);
        this.yaw -= e.movementX * 0.2 * this.sensitivity;
      }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  loadKeybinds(): Record<ActionName, string[]> {
    try {
      const raw = localStorage.getItem(KEYBINDS_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) return { ...DEFAULT_KEYBINDS, ...parsed };
      }
    } catch { /* defaults */ }
    return { ...DEFAULT_KEYBINDS };
  }

  saveKeybinds(): void {
    try { localStorage.setItem(KEYBINDS_STORAGE, JSON.stringify(this.keybinds)); } catch { /* ignore */ }
  }

  resetKeybinds(): void { this.keybinds = { ...DEFAULT_KEYBINDS }; this.saveKeybinds(); }

  setKeybind(action: ActionName, code: string): { success: boolean; conflictAction?: ActionName } {
    for (const [other, keys] of Object.entries(this.keybinds) as [ActionName, string[]][]) {
      if (other !== action && keys.includes(code)) return { success: false, conflictAction: other };
    }
    this.keybinds[action] = [code]; this.saveKeybinds();
    return { success: true };
  }

  clear(): void {
    this.held.clear(); this.pressed.clear();
    this.dragging = false; this.rightHeld = false; this.rightPressed = false; this.attackQueued = false;
  }

  consumeAttack(): boolean {
    const fired = this.attackQueued;
    this.attackQueued = false;
    return fired;
  }

  read(): InputState {
    const has = (...actions: ActionName[]) => actions.some(act =>
      (this.keybinds[act] ?? DEFAULT_KEYBINDS[act]).some(k => this.held.has(k) || this.pressed.has(k))
    );
    const input: InputState = {
      ...emptyInput(),
      // Camera nhìn theo +Z nên trong Three.js (Y lên), +X nằm bên trái màn hình và -X nằm bên phải.
      move: [(has('move_left') ? 1 : 0) - (has('move_right') ? 1 : 0), (has('move_up') ? 1 : 0) - (has('move_down') ? 1 : 0)],
      cam_yaw_deg: this.yaw,
      jump: has('jump'), dash: has('dash'), pulse: has('pulse'),
      interact: has('interact') || this.rightHeld || this.rightPressed,
      pause: has('pause')
    };
    this.pressed.clear(); this.rightPressed = false;
    return input;
  }
}
