# Review IO/world độc lập — nguồn cần review đã đính kèm

KHÔNG gọi công cụ. Đọc các ARTIFACT source/spec đính kèm trực tiếp; không tìm
file khác hoặc gọi shell/network/agent. Review riêng nhóm maps/world/spawn/CLI
và validation. Tìm sai contract1.1 và scenario/input lifecycle, map geometry,
seeded spawning, ID, mã thoát, output. Không đánh đồng thiếu test với bug.
Types suy ra được từ code. Không đòi giữ số tự chọn Phase1 bị Ticket02 thay.
Trả JSON {"decision":"approved","findings":[]} hoặc
{"decision":"changes_requested","findings":[{"priority":"P1/P2","file":"...",
"issue":"...","reproduction":"...","fix":"..."}]}.
Chỉ lỗi thật có cách tái hiện cụ thể, tối đa6; không style, không suy đoán CI.
