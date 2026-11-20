# Review độc lập Phase2

Reviewer riêng qua toolkit, model GPT6.1 Sol high; không sửa mã, không chạy test.
Lượt đầu thiếu công cụ đọc file trong sandbox read-only và được yêu cầu không
shell, nên không có kết luận. Đã gửi source trực tiếp bằng ARTIFACT cho lượt sau.

## Nhóm gameplay

- Phát hiện đúng: flee do pulse giảm bộ đếm ngay tick kích hoạt, mất sớm1tick so
  với flee do cướp. Đã thêm started theo simTick để không giảm ở tick đặt timer;
  có regression test chứng minh còn ở T+119 và biến mất tại T+120.
- Góp ý dash trên ramp: không áp dụng như lỗi. Ticket chỉ yêu cầu giữ cao khi
  **trên không**. Khi grounded trên ramp, bám đất là đúng; khi airborne nhánh bám
  đất không chạy. Test dash-air chứng minh độ cao giữ nguyên12tick.

Review không được coi là test chạy hoặc bảo đảm test ẩn đều đạt.

## Nhóm IO/world

Năm phát hiện đã được sửa và có regression tests riêng (tests/review.test.mjs):

- Từ chối ID mote tường minh trùng nhau, vẫn nhận vector3 truyền thống.
- Dành trước ID charm rồi cấp tên tự động không trùng.
- Không biến hậu tố ID người dùng thành counter số; tránh overflow/vòng lặp vô hạn.
- Enum cần đúng kiểu string; không ép mảng sang string để chấp nhận sai schema.
- TTL/stun mặc định lấy từ tuning, không giữ hằng số480/120 rời rạc.
