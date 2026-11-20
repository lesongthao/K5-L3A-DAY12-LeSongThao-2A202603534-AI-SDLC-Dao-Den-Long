# Ticket-02 — đặc tả thực thi và nghiệm thu

Nguồn: Ticket-02 người dùng cung cấp trong hội thoại. Contract 1.1 thay các
giá trị Phase 1. Không có bằng chứng Phase 1 đã hoàn thành/tag; không tạo lịch sử giả.

## Thay thế rõ ràng

Tuning chuẩn ở game.contract.json là nguồn duy nhất cho luật/số liệu. Đèn 5/6/7,
maps đúng tọa độ đề. Pickup XZ<=1 và lệch cao<=1.5; pulse 3D tâm chân+0.8,
radius5, cooldown180ticks, stun120, đẩy4m/15ticks. Điểm +10 mỗi mote NẠP,
không phải nhặt. Dash14m/s trong12ticks, cooldown90ticks tính từ lúc bắt đầu.
Chết ưu tiên thắng; thắng ưu tiên hết giờ. Rơi có phạt, không chặn mép đảo.

## Nghiệm thu tính năng mới (Phần 3)

| ID | Tiêu chí | Bằng chứng |
|---|---|---|
| P2-01 | Đúng bản đồ 3 đêm, ramp, bệ, cầu và tháp | Map tests + ảnh 3 cảnh |
| P2-02 | Dash đủ12ticks, giữ độ cao, không miễn hit, hướng facing nếu idle | Scenario dash/cooldown/air |
| P2-03 | Gió Lạc đủ idle/chase/flee; cướp3; pulse cứu đồ; không mất máu | Scenario drifter states, drops, TTL |
| P2-04 | Bùa600ticks, speed7.2, dash không cooldown, tái xuất2700ticks | Scenario charm refresh/respawn |
| P2-05 | Menu -> intro -> chơi -> kết quả -> đêm sau -> Bình Minh; thua replay | Browser interaction với QA scenario |
| P2-06 | Pause ngừng sim/time/cooldown/TTL/spawn nhưng tick tăng | Scenario paused/resumed, browser pause |
| P2-07 | Volume và mouse sensitivity lưu localStorage | Browser đổi setting, reload đối chiếu |
| P2-08 | Nhạc và SFX đủ loại; mở audio sau gesture người dùng | Audio event mapping + browser AudioContext |
| P2-09 | HUD đúng vị trí/nội dung, timer cảnh báo, gợi ý E và mũi tên | Browser ảnh + near-lantern scenario |
| P2-10 | Palette chuẩn, ambient=0.15+0.55*lit/count | Constants test + visual review |
| P2-11 | 21600ticks<=30s, 1280x720 trung bình>=30FPS | Measurements thật, ghi renderer/máy |

## Thứ tự tick

Raw tick tăng; cập nhật input/pause trước. Vừa pause thì không step sim.
Resume cho chạy sim ngay ở tick resume. Sim: giảm counters -> player/fall ->
pickup/charm -> deposit -> safe -> pulse -> enemies -> drifter steal ->
shade hit theo id -> spawn -> terminal. CLI xuất snapshot theo raw tick.
night_start phát ở bước gameplay đầu (không có bootstrap event tick0).

## Điểm mơ hồ được chọn và ghi công khai

- Scenario shade mặc định wander hoạt động ngay; spawn bình thường spawning1tick,
  đủ bảo đảm thực thể mới không tương tác trong tick sinh. Wander đi1m/s trên mặt đất.
- Pause là edge toggle; phím còn lại trong pause cập nhật held state, không đệm hành động.
- Dash trên không giữ độ cao12tick rồi tiếp tục vận tốc Y trước dash.
- Bóng tâm Y=ground+0.8; tiếp xúc dùng |player.pos.y - shade.pos.y|<=1.5.
- Đèn tương tác/vùng safe dùng XZ, theo v1.0; không tự thêm điều kiện độ cao.
- `ttl_s:null` cho mote random không hết hạn; dropped có số giây còn lại.
- Lịch sinh dùng sim_tick; 20 motes chọn không trùng từ các điểm chuẩn. Cờ random
  false tắt ban đầu/lịch; arrays scenario luôn thay danh sách tương ứng.
- Hướng gió chọn tại cảnh báo trước2s; active ở tick1800..2099, rồi mỗi1800tick.
- Chuỗi đêm cộng điểm chỉ các đêm thắng; replay đêm thua không cộng điểm đêm thua.
- Ticket chưa chỉ định spawn Đêm 3: chọn (0,0,-30) trên tầng 0 để không xuất phát
  bên trong tháp/tầng 2; Đêm 1/2 spawn (0,0,0). Hồi sinh về spawn của đêm tương ứng.

Giữ bản PRD Phase 1 để truy vết; tài liệu này ưu tiên khi mâu thuẫn.
