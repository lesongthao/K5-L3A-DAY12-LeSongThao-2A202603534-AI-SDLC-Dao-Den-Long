# Bằng Chứng Kiểm Chứng & Truy Vết Yêu Cầu (Phase 1 – Phase 4 · Contract v1.3)

Tài liệu đối chiếu yêu cầu từng phase với bằng chứng chạy thật trong thư mục `docs/proof/phase-4/` (và `docs/proof/phase-2/` cho mốc Phase 2). Toàn bộ tệp kết quả được sinh trực tiếp từ công cụ và trình duyệt thật, không chỉnh sửa tay.

- **Mã băm mã nguồn đồng nhất (`source_sha256`):** `920fef47cbd423cf5979c407b4cb3245cf4306c9a03b6133d7d2fc90f2a224a1` (khớp giữa `verification.json` và `browser-report.json`).
- **Môi trường đã kiểm chứng:** Windows 11 (`win32`), CPU `12th Gen Intel(R) Core(TM) i7-1270P`, Node.js `v26.13.1`, Microsoft Edge/Chromium `157.0.4341.60` (`WebKit WebGL`).

---

## 1. Bảng Truy Vết Yêu Cầu → Bằng Chứng

| Phạm vi | Yêu cầu chính | Cách kiểm chứng / Lệnh | Tệp bằng chứng | Kết quả thực tế |
|---|---|---|---|---|
| **Core & Headless (P1–P3)** | 60Hz fixed timestep, physics 3 đảo, fuel decay, drain, relight, dawn win, validation exit `2` | `npm test` | `tests.log`, `docs/proof/phase-4/verification.json` | **94 / 94 pass** (`0` fail) |
| **Determinism & Speed** | Đêm 3 đủ 18.000 ticks chạy lại 2 lần giống từng byte trong `<= 30s` | `npm run verify` | `night3-a.jsonl`, `night3-b.jsonl`, `headless-a.log`, `headless-b.log` | **89.2 ms**, `deterministic: true` |
| **Feature Scenarios** | `dash`, `pause`, `charm`, `drifter`, `fall`, `wind`, `launch-pad` | `npm run verify` | `scenarios/*.jsonl` & `scenario-*.log` (7 ca) | **7 / 7 pass** |
| **Benchmark (P4-01)** | 200 Bóng, 100 Đom đóm, cam xoay 15s, 30s tắt VSync (`>= 60` avg, `>= 30` 1% low, `<= 33.3ms` p95) | `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` | `bench.json` (`docs/proof/phase-4/bench.json`) | **242 FPS** avg, **121.6 FPS** 1% low, **5.6 ms** p95, **2149 ms** load |
| **Soak Test (P4-02)** | 10 đêm liên tục 1 tiến trình, `crashes = 0`, `mem_end <= 1.2 * mem_start` | `node scripts/soak.mjs --seed 7 --nights 10` | `soak.json`, `soak.log` | **0 crash**, `53 MB → 58 MB` (`0.3s`) |
| **Leaderboard (P4-03)** | Top 10 giảm dần, lưu địa phương, CLI `--export-leaderboard` | `npm test` + `npm run verify` | `leaderboard.json`, `export-leaderboard.log`, `leaderboard.png` | **Pass** (có UI & JSON export) |
| **Trợ năng (P4-04..06)** | Đổi 9 phím, colorblind, reduced motion, font `>= 18px` (`1280×720`), cảnh báo hình ảnh | `npm run test:browser` | `browser-report.json`, `night-1.png`..`3.png` | **Pass** (`font >= 18px`, Audio `running`) |
| **Sáng tạo & HUD** | Đánh 3 gậy hạ quái / `Q` 1 phát hạ ngay, thanh máu 3 đốt, không chồng lấn HUD ở `1280×640` | `npm run test:browser` + visual check | `combat-hud.png`, `menu.png`, `dawn.png`, `browser-report.json` | **0 page error**, **0 HUD overlap** |

---

## 2. Ghi Nhận Trung Thực Về Phạm Vi Chưa Kiểm Chứng Tại Local

- **GitHub Actions Linux CI (`.github/workflows/verify.yml`):** Workflow đã cấu hình cho `ubuntu-latest` (Node 22), nhưng chưa được đẩy lên GitHub nên kết quả thực tế ở bảng trên được đo trên Windows (`win32`). Sau khi push lên GitHub, cần xem kết quả run thực tế trên tab Actions.
- **Video demo & Git Tags/Release:** Tệp [`docs/demo/demo.mp4`](../../demo/demo.mp4) (`74.93 MB`) đã sẵn sàng trong repo; Git tags (`phase-1`…`phase-4`) và Release `v1.0.0` thực hiện khi push lên GitHub.
