export interface LeaderboardEntry {
  name: string;
  score: number;
  nights_won: number;
  achieved_at: string;
  seed: number;
}

/** Kiểm tra tên hợp lệ (3–12 ký tự chữ, số, gạch dưới hoặc tiếng Việt có dấu). */
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 12) return false;
  return /^[\p{L}\p{N}_ ]{3,12}$/u.test(trimmed);
}

/** Sắp xếp Top 10 giảm dần theo score; bằng điểm thì đạt trước đứng trên. */
export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.achieved_at.localeCompare(b.achieved_at);
    })
    .slice(0, 10);
}

export function insertScore(
  entries: LeaderboardEntry[],
  newEntry: { name: string; score: number; nights_won: number; seed: number; achieved_at?: string }
): LeaderboardEntry[] {
  const achieved_at = newEntry.achieved_at ?? new Date().toISOString();
  const raw = newEntry.name.trim().replace(/\s+/g, '_');
  const cleanName = validateName(raw) ? raw : 'May_Nho';
  const entry: LeaderboardEntry = {
    name: cleanName,
    score: Math.max(0, Math.floor(newEntry.score)),
    nights_won: Math.max(0, Math.min(3, Math.floor(newEntry.nights_won))),
    achieved_at,
    seed: newEntry.seed
  };
  return sortLeaderboard([...entries, entry]);
}
