# Ticket-03 — Đặc Tả Thực Thi & Nghiệm Thu (Phase 3)

Nguồn: Ticket-03 Change Request "Đèn cạn dầu" từ khách hàng (Contract v1.2).
Phase 3 thay thế cơ chế thắng sớm và trạng thái tĩnh của đèn bằng cơ chế quản lý nhiên liệu và phòng thủ sinh tồn tới bình minh.

---

## 1. Tóm Tắt Các Điểm Thay Thế (Breaking Changes)

| STT | Quy tắc cũ (Phase 2 / v1.1) | Quy tắc mới (Phase 3 / v1.2) |
|---|---|---|
| 1 | Đèn thắp rồi không nhận thêm đom đóm | Đèn nhận châm dầu khi `fuel < 100`. Hết dầu (`fuel <= 0`) thì tắt. |
| 2 | Đèn luôn cần 10 đom đóm | Thắp lần đầu: 10 đom đóm. Thắp lại (`ever_lit`): chỉ cần 5 đom đóm. |
| 3 | Bóng Mực không vào vùng an toàn | Đèn `fuel < 30` mất vùng an toàn. Bóng Mực `wander` tìm đến hút dầu (`drain`). |
| 4 | Thắng ngay khi tất cả đèn sáng (`all_lit`) | Bỏ thắng sớm. Thắng khi hết giờ và số đèn sáng $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ (`dawn_survived`). |
| 5 | Sức chứa cố định 10 | Sức chứa tăng dần: $10 + 2 \times \text{successful\_lights}$, tối đa 20. |
| 6 | Thưởng thời gian khi thắng sớm | Bỏ thưởng thời gian. Điểm mới tính lúc bình minh theo đèn sáng và lượng dầu còn lại. |
| 7 | Thời lượng Đêm 1/2/3: 300/330/360s | Thời lượng Đêm 1/2/3: 240/270/300s. |

---

## 2. Tiêu Chí Nghiệm Thu Tính Năng Mới (P3-01 -> P3-10)

| ID | Tiêu chí | Bằng chứng |
|---|---|---|
| **P3-01** | Đèn tiêu hao dầu 1.0/s khi sáng; hết dầu tắt (`fuel <= 0`, `lantern_out`, `ever_lit = true`) | Unit test decay & snapshot |
| **P3-02** | Châm dầu: bấm E châm số đom đóm cần thiết, cộng dầu, phát `refuel`, đèn đầy không nhận | Unit test refuel logic & interaction |
| **P3-03** | Thắp lại đèn đã từng sáng chỉ tốn 5 đom đóm, phát `lantern_lit { relight: true }` | Unit test relight cost & event |
| **P3-04** | Đèn `fuel < 30` mất safe zone; Bóng Mực wander ưu tiên tới đèn này và chuyển sang `drain` khi XZ $\le 2$m | Scenario & test drain AI |
| **P3-05** | Trạng thái `drain`: hút 5 fuel/s, phát `fuel_drain` mỗi 60 tick; chuyển `chase` khi Mây vào 6m | Scenario & test drain lifecycle |
| **P3-06** | Tỏa Sáng (Pulse) trúng Bóng đang `drain` được +15 điểm (bình thường +5); châm dầu $\ge 30$ đẩy bóng ra | Test score & safe ejection |
| **P3-07** | Luật thắng mới: hết giờ sống và đèn sáng $\ge \lceil 0.6 \times N \rceil$ thắng (`dawn_survived`); dưới thì thua `dawn` | Test dawn win/loss thresholds |
| **P3-08** | Sức chứa tăng dần: $10 + 2 \times \text{successful\_lights}$, max 20, HUD cập nhật | Test player capacity & HUD |
| **P3-09** | Chế độ mù màu: viền/mắt bóng đổi sang `#00B3FF`, cảnh báo `#FFFFFF` kèm ⚠, đèn tắt xẹp 20% | Visual review & settings test |
| **P3-10** | Test Contract v1.2 đầy đủ tuning, events, validation schema; 18000 ticks $\le 30$s | Benchmark & verification suite |
