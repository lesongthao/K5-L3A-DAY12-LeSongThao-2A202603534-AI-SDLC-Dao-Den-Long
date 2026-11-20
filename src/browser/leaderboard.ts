import { insertScore, sortLeaderboard, validateName, type LeaderboardEntry } from '../core/leaderboard.js';

const STORAGE_KEY = 'dao-den-long-leaderboard';

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: 'May_Vang', score: 1850, nights_won: 3, achieved_at: '2026-11-20T14:30:00+07:00', seed: 202603534 },
  { name: 'Ong_Dang', score: 1420, nights_won: 2, achieved_at: '2026-11-20T13:15:00+07:00', seed: 42 }
];

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return sortLeaderboard(parsed);
    }
  } catch { /* Dùng dữ liệu mặc định */ }
  return sortLeaderboard(DEFAULT_LEADERBOARD);
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortLeaderboard(entries)));
  } catch { /* Trình duyệt chặn storage */ }
}

export function isEligible(score: number): boolean {
  const lb = getLeaderboard();
  if (lb.length < 10) return true;
  return score > (lb[lb.length - 1]?.score ?? 0);
}

export function recordScore(name: string, score: number, nightsWon: number, seed: number): { ok: boolean; entries: LeaderboardEntry[] } {
  if (!validateName(name)) return { ok: false, entries: getLeaderboard() };
  const updated = insertScore(getLeaderboard(), { name, score, nights_won: nightsWon, seed });
  saveLeaderboard(updated);
  return { ok: true, entries: updated };
}

export function renderLeaderboardRows(entries: LeaderboardEntry[]): string {
  if (entries.length === 0) return '<tr><td colspan="5">Chưa có điểm nào.</td></tr>';
  return entries.map((e, idx) => `
    <tr>
      <td class="lb-rank">#${idx + 1}</td>
      <td class="lb-name">${escapeHtml(e.name)}</td>
      <td class="lb-score">${e.score}</td>
      <td class="lb-night">${e.nights_won} / 3 Đêm</td>
      <td class="lb-date">${e.achieved_at.slice(0, 10)}</td>
    </tr>
  `).join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
