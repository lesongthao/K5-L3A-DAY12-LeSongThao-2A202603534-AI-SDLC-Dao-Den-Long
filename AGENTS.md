# Đảo Đèn Lồng — Phase 4 / Contract 1.3 (Bình minh v1.0.0)

- Trao đổi bằng tiếng Việt. Codex thiết kế/review, Antigravity triển khai qua toolkit.
- Đọc `docs/PRD.md`, `docs/PHASE2.md`, `docs/PHASE3.md`, `docs/PHASE4.md`, `docs/ARCHITECTURE.md` và `docs/source/PRD-0.txt` trước khi thay luật.
- Node.js >=22.12; TypeScript strict; Three.js + Vite. Mỗi file mã nguồn trong `src/` <=300 dòng.
- Cài: `npm ci`. Chơi dev: `npm run dev`. Build: `npm run build`. Chạy release: `npm run preview`.
- Kiểm tra: `npm test` (unit + contract); `npm run verify` (headless + soak + scenarios); `npm run test:browser` (Playwright UI + FPS + HUD); `node scripts/bench.mjs` (đo hiệu năng 30s). Không kết luận đạt nếu thiếu output thật.
- Logic core (`src/core/`) không import Three.js, DOM, fs, thời gian thực hoặc `Math.random`.
- Game web và CLI dùng cùng `createGame`/`step`/`snapshot`; cố định 60 bước/giây (`tick` đếm cả pause, `simTick` chỉ chạy lúc chơi).
- Tuning chỉ lấy từ `game.contract.json` (Contract v1.3); không lặp hằng số gameplay trong UI.
- Phase 3 (`Ticket-03`): đèn hao 1 fuel/s (`fuelTicks`), `fuel < 30` mất safe zone, Bóng Mực hút dầu (`drain`), thắng tại bình minh (`dawn_survived`) khi đạt `>= ceil(0.6 * N)` đèn sáng; giữ nguyên ở Phase 4.
- Phase 4 (`Ticket-04`): bổ sung `bench_cmd`, `soak_cmd`, Leaderboard Top 10 (`--export-leaderboard`), trợ năng (đổi 9 phím, chữ lớn >=18px, reduced motion, chỉ báo thị giác).
- Tính năng sáng tạo ở lớp trình duyệt (`combat.ts`, `cheats.ts`, `guide.ts`, `ambience.ts`, `vfx-combat.ts`) tự động tắt khi chạy headless, soak hoặc `?bench=1` để giữ nguyên 100% tính tất định Contract.
- Không sửa tests để che lỗi, không tạo output bằng chứng giả, không giấu lỗi kiểm tra.
- Giữ tài liệu lab gốc (`GUIDE.md`, `RULES.md`, `RUBRIC.md`, `CHECKPOINTS.md`, `SUBMISSION.md`); README dẫn lại đầy đủ.
- Không secret, không commit/push/tag/đổi tên repo khi chưa được giao riêng.
