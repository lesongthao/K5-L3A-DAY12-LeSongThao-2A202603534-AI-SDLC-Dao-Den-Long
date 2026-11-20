# Thay đổi test khi tiếp nhận Ticket-02 & Ticket-03

Không tắt test cũ. Các assert đổi vì yêu cầu mới thay luật:

## 1. Giai Đoạn Phase 2 (Ticket-02)

| Test Phase1 | Yêu cầu Phase2 thay thế |
|---|---|
| Snapshot player chỉ pos/carried/flames | Snapshot1.1 thêm vel/grounded/counters |
| Night2 bị từ chối | CLI nhận1/2/3; test từ chối night4 |
| Pickup radius1.2, bỏ qua cao, cộng điểm | Radius1, cao<=1.5, điểm cộng lúc nạp |
| Pulse radius6 theo XZ, đẩy tức thì2m | Radius5 theo3D, đẩy4m trong15tick |
| Pulse cooldown60tick, stun score20 | Cooldown180tick, stun score5 |
| Shade speed2.5 | Speed4, đêm3 speed4.5 |
| Chỉ100 điểm khi thắp từ10mote mang sẵn | +100nạp và +100thắp |
| Không rơi, win luôn ưu tiên | Có rơi; no_flames ưu tiênwon, won ưu tiêndawn |

---

## 2. Giai Đoạn Phase 3 (Ticket-03)

| Test Phase 2 (v1.1) | Yêu cầu Phase 3 (v1.2) thay thế |
|---|---|
| Thắng sớm ngay khi 5 đèn sáng (`all_lit`) | Bỏ thắng sớm; thắng khi hết giờ bình minh và số đèn sáng $\ge \lceil 0.6 \times N \rceil$ (`dawn_survived`) |
| Thưởng điểm thời gian còn lại ($2 \times \text{time\_left\_s}$) | Bỏ thưởng thời gian; điểm bình minh tính $50 + \lfloor fuel \rfloor$ mỗi đèn sáng và $+50$ mỗi Ngọn Lửa |
| Điểm nạp đom đóm $+10$/con | Điểm nạp đom đóm $+5$/con (thắp mới, thắp lại hoặc châm dầu) |
| Đèn sáng không nhận thêm đom đóm | Đèn nhận châm dầu khi `fuel < 100`, trừ số đom đóm cần thiết |
| Đèn luôn tốn 10 đom đóm để thắp | Đèn thắp lại (`ever_lit: true`) chỉ tốn 5 đom đóm, thưởng $+40$ điểm |
| Thời lượng Đêm 1: 300s (sau 120 ticks còn 298s) | Thời lượng Đêm 1: 240s (sau 120 ticks còn 238s) |
| Sức chứa túi đom đóm cố định 10 | Sức chứa động: $10 + 2 \times \text{successful\_lights}$, tối đa 20 |
| Snapshot đèn chỉ có id, pos, lit, deposited | Snapshot v1.2 có thêm `fuel`, `ever_lit`, `relit_count`; player có `capacity` |
| Bóng Mực chỉ có 5 trạng thái | Thêm trạng thái `drain` khi hút dầu tại đèn có `fuel < 30` |

Mỗi thay đổi đều có lý do rõ ràng từ văn bản Ticket-03 và được bảo vệ bằng test tự động.
