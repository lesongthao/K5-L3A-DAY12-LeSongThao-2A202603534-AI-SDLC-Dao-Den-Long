# Quyết Định Kiến Trúc (ADR 003) — Quản Lý Nhiên Liệu Đèn & Luật Thắng Bình Minh

- **Trạng thái:** Chấp thuận (*Approved*)
- **Ngày:** 2026-11-20
- **Tác giả:** Lê Sông Thao (2A202603534) & Antigravity
- **Phạm vi:** Core Gameplay, Snapshot Serialization, AI State Machine, Scoring

---

## 1. Bối Cảnh (Context)
Trong Phase 1 và Phase 2, điều kiện chiến thắng là thắp sáng tất cả các Đèn Lồng Lớn (`all_lit`). Người chơi giỏi có thể hoàn thành trong 2 phút, dẫn đến giai đoạn cuối mỗi đêm thiếu đi sự kịch tính. Ngoài ra, đèn khi đã sáng trở thành vĩnh cửu và vùng an toàn không bao giờ bị đe dọa.

Khách hàng ban hành **Ticket-03 (Contract v1.2)** nhằm biến lối chơi thành "Giữ đảo sáng tới bình minh" với cơ chế cạn dầu và quái hút dầu.

---

## 2. Quyết Định Thiết Kế (Decisions)

### 2.1. Đơn Vị Đo & Độ Chính Xác Nhiên Liệu (Fuel Precision)
- **Vấn đề:** Hao hụt $1.0$ đơn vị/giây và hút $5.0$ đơn vị/giây nếu tính bằng số thực `float` trong 60 ticks/giây sẽ gây tích lũy sai số dấu phẩy động.
- **Giải pháp:** Lưu trữ nhiên liệu nội bộ bằng đơn vị nguyên `fuelTicks` ($100$ fuel tương ứng với $6000$ fuelTicks).
  - Tự hao: trừ $1$ fuelTick mỗi tick mô phỏng.
  - Bị hút: trừ $5$ fuelTicks mỗi tick mô phỏng cho mỗi Bóng Mực ở trạng thái `drain`.
  - Châm dầu: mỗi đom đóm hồi phục $10$ fuel ($600$ fuelTicks).
  - Khi xuất snapshot hoặc event: tính `fuel = round1(fuelTicks / 60)`. Đèn tắt xuất `fuel: 0`.

### 2.2. Máy Trạng Thái Của Đèn (Lantern State Machine)
Đèn lồng chuyển từ 2 trạng thái (`unlit` $\rightarrow$ `lit`) sang chu trình tuần hoàn:
1. `UNLIT_FRESH`: Đèn chưa từng sáng (`ever_lit: false`). Cần 10 đom đóm để thắp.
2. `LIT_SAFE`: Đèn đang sáng với `fuel >= 30`. Có vùng an toàn 6m.
3. `LIT_VULNERABLE`: Đèn đang sáng với `0 < fuel < 30`. Mất vùng an toàn, nhấp nháy 1 Hz, thu hút Bóng Mực `wander` đến hút dầu.
4. `UNLIT_DEPLETED`: Đèn hết dầu (`fuel <= 0`). Chuyển sang tắt, phát `lantern_out`, ghi nhớ `ever_lit: true`.
5. `RELIGHT`: Thắp lại từ `UNLIT_DEPLETED` chỉ cần 5 đom đóm, chuyển lại thành `LIT_SAFE` với 100 fuel.

### 2.3. Máy Trạng Thái Bóng Mực (Shade Drain State)
- Bổ sung trạng thái `drain` vào `ShadeMode`.
- Khi ở `wander`, Bóng Mực tìm đèn sáng có `fuel < 30` gần nhất (ưu tiên khoảng cách XZ, hòa lấy ID nhỏ). Khi đến cách đèn $\le 2$m thì chuyển sang `drain`.
- Trong `drain`: Bóng Mực đứng yên, hút 5 fuel/s. Phát sự kiện `fuel_drain` định kỳ mỗi 60 ticks.
- Chuyển trạng thái:
  - Sang `chase`: khi người chơi Mây tiến vào bán kính 6m.
  - Sang `stunned`: khi trúng Tỏa Sáng (`pulse`), nhận $15$ điểm thưởng (thay vì $5$ điểm).
  - Sang `wander`: khi đèn tắt, hoặc đèn được nạp $\ge 30$ fuel, hoặc cách đèn $> 2$m.

### 2.4. Luật Thắng & Thứ Tự Xét Kết Thúc (Win & Termination)
- Bỏ hoàn toàn điều kiện thắng sớm `all_lit`.
- Tại tick bình minh (`timeLeft <= 0`):
  - Kiểm tra số đèn đang sáng $L_{lit} \ge \lceil 0.6 \times N_{lanterns} \rceil$.
  - Nếu đạt: thắng với lý do `dawn_survived`. Cộng điểm bình minh: $50 + \lfloor fuel \rfloor$ cho mỗi đèn sáng, $+50$ cho mỗi Ngọn Lửa còn lại. Bỏ điểm thưởng thời gian.
  - Nếu không đạt: thua với lý do `dawn`.
- Thứ tự ưu tiên: Hết Ngọn Lửa (`flames <= 0`) luôn thua với lý do `no_flames` ngay lập tức, kể cả tại tick bình minh.

---

## 3. Hệ Quả (Consequences)
- Các bài test Phase 1/2 mong đợi thắng sớm `all_lit` hoặc điểm thưởng thời gian cần được cập nhật sang Contract v1.2.
- Headless snapshot có thêm các trường `fuel`, `ever_lit`, `relit_count` ở đèn và `capacity` ở người chơi.
- Trò chơi duy trì tính tất định tuyệt đối và hiệu năng cực cao trên Node.js.
