# Ticket-04 — Đặc Tả Thực Thi & Nghiệm Thu (Phase 4)

Nguồn: Ticket-04 "Bình minh: phát hành v1.0.0" từ khách hàng (Contract v1.3).
Phase 4 hoàn thiện sản phẩm thương mại hoàn chỉnh: đo lường hiệu năng chuẩn hóa, kiểm thử chạy lâu chống rò rỉ bộ nhớ, bảng xếp hạng cục bộ, trợ năng toàn diện và đóng gói phát hành.

---

## 1. Tiêu Chí Nghiệm Thu Phase 4

| ID | Yêu cầu | Tiêu chí đạt | Bằng chứng |
|---|---|---|---|
| **P4-01** | Chế độ benchmark (`bench_cmd`) | 200 bóng, 100 đom đóm, cam xoay 15s/vòng, 1280x720, đo 30s. `avg_fps >= 60`, `p1_low_fps >= 30`, `load_ms <= 10000` | `bench.json` |
| **P4-02** | Chế độ soak test (`soak_cmd`) | Chạy 10 đêm liên tục 1 tiến trình, input ngẫu nhiên theo seed; `crashes = 0`, `mem_end <= 1.2 * mem_start` | `soak.json` |
| **P4-03** | Bảng xếp hạng cục bộ | Top 10 sắp xếp theo điểm giảm dần, lưu vĩnh viễn trên đĩa, xuất qua `--export-leaderboard` | `data/leaderboard.json` + UI menu |
| **P4-04** | Đổi phím (Key Remapping) | Đổi đủ 9 phím hành động, cảnh báo trùng phím, khôi phục mặc định, lưu cấu hình | Settings UI & tests |
| **P4-05** | Phụ đề & chỉ báo hình ảnh | Báo bóng xuất hiện kèm mũi tên mép màn hình, gió thổi, 10s cuối, đèn cạn dầu | Visual HUD & scenarios |
| **P4-06** | Giảm chuyển động & cỡ chữ | Bật tắt chớp sáng/rung lắc; font $\ge 18$px ở 1280x720; tùy chọn chữ lớn $\times 1.25$ | Settings UI & CSS |
| **P4-07** | Đóng gói & 3 lệnh chơi sạch | Clone sạch $\rightarrow$ `npm ci && npm run build && npm run preview` $\le 3$ lệnh chơi được | Clean install validation |
| **P4-08** | Tài liệu phát hành & Retro | `README.md`, `CHANGELOG.md` (4 phase), `CREDITS.md`, `LICENSE`, `docs/notes/retro.md` | Tài liệu đầy đủ |
| **P4-09** | Test Contract v1.3 | Schema v1.3 gồm `bench_cmd`, `soak_cmd`, 100% test v1.0-v1.2 tiếp tục đạt | `npm test` & verification |
