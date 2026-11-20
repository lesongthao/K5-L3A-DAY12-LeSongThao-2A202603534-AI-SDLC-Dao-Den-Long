# Nhật Ký Thay Đổi (Changelog) — Đảo Đèn Lồng (v1.0.0)

Tài liệu ghi lại toàn bộ tiến trình phát triển và các thay đổi qua 4 Phase của dự án Đảo Đèn Lồng.

---

## [Phase 1] — PRD-0 · Nền Tảng Headless (Contract v1.0)
### Thêm mới (Added)
- Bộ mô phỏng vật lý và logic game lõi (`src/core/`) chạy 60 ticks/giây cố định.
- Bản đồ Đêm 1 (Đảo Bến) với 5 Đèn Lồng Lớn.
- Cơ chế di chuyển người chơi Mây (WASD, nhảy, camera 3D).
- Đom đóm rải rác và cơ chế nạp đèn (cần 10 đom đóm để thắp sáng).
- Quái Bóng Mực (`wander`, `chase`, `stunned`).
- Cơ chế Tỏa Sáng (`pulse`) làm choáng và đẩy lùi Bóng Mực.
- Headless CLI (`dist/node/headless/cli.js`) xuất snapshot JSONL có tính tất định (*deterministic*).

---

## [Phase 2] — Ticket-02 · Ba Hòn Đảo (Contract v1.1)
### Thay đổi (Changed)
- Nâng cấp Test Contract lên **v1.1**.
- Chuẩn hóa tuning duy nhất tại `game.contract.json`.
- Mở rộng 3 bản đồ: Đảo Bến (5 đèn), Đảo Cau (6 đèn, cầu tre), Đảo Chuông (7 đèn, tháp cao).
- Bổ sung cơ chế Dash (lướt 12 ticks, hồi chiêu 90 ticks), cơ chế rơi khỏi đảo có phạt mất máu và hồi sinh.
- Thêm Bùa Gió (tăng tốc độ chạy 7.2 m/s, lướt không hồi chiêu) và Bệ phóng đỏ.
- Thêm kẻ địch Gió Lạc (trộm đom đóm, có thể giải cứu bằng Tỏa Sáng) và gió giật theo chu kỳ.
- Giao diện Three.js + Vite với HUD đầy đủ, âm thanh WebAudio và lưu cài đặt chuột/âm lượng.

---

## [Phase 3] — Ticket-03 · Đèn Cạn Dầu (Contract v1.2)
### Thay đổi phá vỡ tương thích (Breaking Changes)
- Nâng cấp Test Contract lên **v1.2**.
- Loại bỏ điều kiện thắng sớm `all_lit`. Thắng chuyển sang sinh tồn tới bình minh (`dawn_survived`) khi giữ được $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ đèn sáng.
- Đèn tự tiêu hao nhiên liệu 1.0 fuel/giây. Hết dầu (`fuel <= 0`) sẽ tắt (`lantern_out`) và cần 5 đom đóm để thắp lại (`relight_cost: 5`).
- Đèn nhận châm dầu khi `fuel < 100` bằng phím tương tác E.
- Đèn `fuel < 30` mất vùng an toàn 6m. Thêm trạng thái `drain` cho Bóng Mực hút 5 fuel/giây.
- Sức chứa túi đom đóm tăng dần theo số lần thắp đèn: $10 + 2 \times \text{successful\_lights}$ (tối đa 20).
- Hệ thống tính điểm mới: nạp đom đóm (+5), thắp mới (+100), thắp lại (+40), Tỏa Sáng trúng bóng hút dầu (+15), thưởng bình minh theo lượng dầu và số ngọn lửa còn lại.
- Thêm chế độ tương phản cao (*Colorblind Mode*).

---

## [Phase 4] — Ticket-04 · Bình Minh v1.0.0 (Contract v1.3)
### Thêm mới (Added)
- Nâng cấp Test Contract lên **v1.3**.
- Thêm lệnh chạy benchmark chuẩn hóa (`bench_cmd`): 200 bóng, 100 đom đóm, camera xoay 15s/vòng, 1280x720, đo 30s xuất `bench.json`.
- Thêm lệnh kiểm thử độ bền soak test (`soak_cmd`): chạy 10 đêm liên tục không rò rỉ bộ nhớ, xuất `soak.json`.
- Thêm Bảng xếp hạng cục bộ Top 10 (`data/leaderboard.json`), hỗ trợ xuất file qua `--export-leaderboard` và giao diện xem từ Menu.
- Trợ năng toàn diện:
  - Đổi phím điều khiển (*Key Remapping*) đầy đủ 9 hành động, phát hiện trùng phím và nút khôi phục mặc định.
  - Phụ đề và chỉ báo hình ảnh (bóng xuất hiện với mũi tên chỉ hướng mép màn hình, gió giật, đếm ngược 10s cuối, cảnh báo đèn cạn dầu).
  - Tùy chọn giảm chuyển động (*Reduced Motion*) tắt chớp sáng và rung lắc màn hình.
  - Cỡ chữ UI chuẩn hóa $\ge 18$px ở 1280x720, kèm tùy chọn chữ lớn ($\times 1.25$).
- Hoàn thiện tài liệu phát hành, video demo hướng dẫn và đóng gói GitHub Release `v1.0.0`.
