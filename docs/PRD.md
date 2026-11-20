# PRD — Đảo Đèn Lồng, Phase 1

> Bản lưu quyết định Phase 1. Triển khai hiện tại là Phase 2: docs/PHASE2.md
> và Contract 1.1 thay thế mọi số liệu/luật mâu thuẫn bên dưới.

Nguồn nguyên văn: source/PRD-0.txt. Phân biệt yêu cầu đề và giả định dưới đây.

## Yêu cầu bắt buộc

Game 3D góc nhìn thứ ba, một màn Đêm 1 – Đảo Bến hình tròn có đúng 5 đèn L1…L5.
Mây đội nón lá treo đèn nhỏ, đi, nhảy; camera xoay. Nhặt đom đóm rồi nạp đèn.
Bóng Mực đuổi và chạm gây mất máu, sợ đèn; tỏa sáng tốn tài nguyên để xua chúng.
Thắp hết đèn thắng; hết máu thua. Có điểm, HUD, chơi lại. Đêm cổ tích ấm áp,
vàng cam là an toàn, tím đen là nguy hiểm, đảo sáng dần; không máu me.
Chạy được trên macOS/Linux bằng bản web và Node CLI. Bàn giao game.contract.json,
headless v1.0, bằng chứng thật, hướng dẫn <=3 lệnh, nhật ký AI và harness.

## Giả định đã chọn

- Tuning trong game.contract.json là nguồn duy nhất: speed 6, capacity 10, cost 10,
  pickup 1.2, interact 2, duration 300, flames 3, pulse cost/radius 3/6,
  stun 2s, push 2m, cooldown 1s, invuln 1.5s, drop 0, safe 4,
  shade speed/hit radius 2.5/0.8, fall false.
- Điểm: nhặt 10, đèn 100, mỗi Bóng Mực trúng pulse 20; thắng thưởng
  floor(max(time_left_s,0))*2 + flames*50, đúng một lần, thua không thưởng.
- Đảo bán kính 35m; đèn trên vòng bán kính 22m tại góc 0,72,144,216,288 độ.
  Người chơi bị chặn ở mép, không có phạt rơi. Nhảy v0=6m/s, gravity=18m/s².
- Nhặt tự động, không vượt túi. Một lần E nạp min(carried,cost-deposited) vào
  đèn chưa sáng gần nhất trong bán kính; đồng khoảng cách chọn theo ID.
- Q khi đủ carried và hết cooldown: trừ đúng pulse_cost, event pulse kể cả không
  trúng ai. Mỗi shade trong bán kính bị đẩy ra 2m, choáng 2s; tính điểm từng shade.
  Nếu trùng vị trí dùng hướng +X. Choáng không di chuyển/đánh; có thể bị pulse lại.
- Đèn sáng tạo vùng cấm shade <=safe_radius; shade đang ở trong khi đèn sáng được
  đẩy ra safe_radius+0.001, kể cả shade đang choáng. Không sinh shade trong vùng này.
- Va chạm mỗi lần mất 1 flame; invuln 1.5s; một tick tối đa một hit.
- Một tick: input/move/jump -> pickup -> deposit -> pulse -> shade update/safe zone
  -> hit -> timer -> kết thúc. Nếu cùng tick thì won > no_flames > dawn.
- Sau dựng scenario chưa tự cộng điểm/phát event. Kiểm tra kết thúc khi step đầu;
  tick 0 vẫn là trạng thái playing ban đầu. Timer scenario là thời lượng còn lại
  ban đầu của lần chạy: initial_time_left - sim_tick/60, clamp về 0.
- Mặc định 60 motes, 2 shades; thêm 1 mote mỗi 180 tick (max60),
  1 shade mỗi 600 tick (max6); không sinh trong tick 0 event. Random flags false
  tắt sinh ban đầu và về sau; danh sách scenario thay danh sách ban đầu.
- Random có seed; id riêng M1…, S1… ổn định và không trùng id scenario.
- WASD, chuột/kéo để xoay camera, Space nhảy, E nạp, Q pulse, R chơi lại sau kết thúc.
- Không dash, không multiplayer/backend/tài khoản; sáng tạo chỉ là trang trí.

## Tiêu chí nghiệm thu

| ID | Yêu cầu | Kiểm chứng |
|---|---|---|
| P1-01 | Đi/chạy chéo theo camera, nhảy | Node test số học + chơi thật |
| P1-02 | Pickup/capacity/deposit/5 đèn | Scenario và event JSONL |
| P1-03 | Chase/hit/invuln/safe/pulse | Scenario biên và hồi chiêu |
| P1-04 | Win/loss/timer/score/restart | Scenario end + UI replay |
| P1-05 | 3D, nón lá, màu, HUD, sáng dần | Ảnh trình duyệt + kiểm tra tương tác |
| P1-06 | CLI v1.0, tick/input/scenario/output | Contract tests, invalid input, repeat byte comparison |
| P1-07 | Cài/chạy đa nền tảng | Clean install/build/test, CI Linux; ghi môi trường đã chạy |

Tag phase-1 và thời hạn theo Coach; chưa tự tạo tag hoặc sửa lịch sử.
