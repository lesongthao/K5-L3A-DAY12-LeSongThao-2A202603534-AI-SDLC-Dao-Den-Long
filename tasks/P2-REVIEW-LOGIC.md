# Review logic độc lập — mọi nguồn cần review được đính kèm

KHÔNG gọi công cụ. Tất cả source cần review nằm trong các ARTIFACT đính kèm.
Không tìm tệp khác, không shell/network, không agent khác. TypeScript types
có thể suy ra từ code và contract. Review riêng nhóm gameplay đã đính kèm;
không yêu cầu chứng minh thành phần ngoài nhóm. Đặc tả ưu tiên docs/PHASE2.md.

Tìm lỗi thực tế về thứ tựtick/pause, dash, fall, height, cooldown, safe/pulse,
AI, drops/TTL, charm, drifter, scoring. Không đánh đồng thiếu test với bug.
Trả JSON {"decision":"approved","findings":[]} nếu không thấy lỗi, hoặc
{"decision":"changes_requested","findings":[{"priority":"P1/P2","file":"...",
"issue":"...","reproduction":"...","fix":"..."}]}.
Chỉ nêu lỗi có cách tái hiện cụ thể, tối đa6, bỏ góp ý style. Chưa có LinuxCI;
không suy đoán có. 74 Node tests và browser report đã đạt tại lượt chạy thật.
