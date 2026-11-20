---
name: verify-game
description: Kiểm chứng Đảo Đèn Lồng Contract v1.3 (v1.0.0) bằng CLI headless, Soak, Benchmark và Playwright.
---

1. Đọc `docs/PHASE4.md`, `docs/PHASE3.md` và `game.contract.json`. Không sửa tuning hay làm giả output để test xanh.
2. Chạy `npm run build && npm test && npm run verify`. Nếu lỗi, đọc log trong `docs/proof/phase-4` và sửa tận gốc.
3. Kiểm chứng giao diện và độ mượt trên trình duyệt thật: chạy `npm run test:browser` (tự mở `vite preview` tại cổng 5173 nếu chưa bật). Windows dùng Edge; Linux dùng Chromium của Playwright, không suy đoán FPS.
4. Chạy benchmark 30s (tắt VSync): `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`, sau đó chạy lại `npm run verify` để đồng bộ `docs/proof/phase-4/verification.json`.
5. Kiểm tra trực quan ảnh chụp trong `docs/proof/phase-4/*.png` (`menu`, `leaderboard`, `night-1..3`, `combat-hud`, `dawn`) bảo đảm không chồng lấn HUD ở `1280x640` / `1280x720`.
6. Ghi đúng môi trường, số đo thực tế và phần chưa kiểm tra (như CI Linux trên GitHub hay quay video demo).
