# Review độc lập Phase 2 — chỉ đọc

Review code thực tế trong src/core/, src/headless/, src/browser/ và tests/.
Đọc docs/PHASE2.md, game.contract.json, docs/ARCHITECTURE.md. Dùng read-only tools;
không sửa file, không gọi agent khác, không chạy shell/network hoặc test.
Tìm lỗi thực tế về contract 1.1/thứ tự tick, pause, cooldown, dash/air, fall,
safe/pulse3D, drop/TTL, charm, drifter, maps/ramp/pads/tower, score và UI campaign.
V1.0 invariants vẫn áp dụng trừ thay đổi rõ của Ticket02; không đòi giữ giả định cũ.
Không đánh đồng thiếu test với bug. Nêu tối đa 8 lỗi có tác động và cách tái hiện,
ghi file và vị trí. Chỉ trả JSON {"decision":"approved","findings":[]} nếu
không có lỗi; nếu lỗi decision="changes_requested", findings=[{priority,file,
issue,reproduction,fix}]. Đã có 67 Node tests passed và browser report thật tại
docs/proof/phase-2/browser-report.json (~60FPS1280x720, campaign/pause/settings).
Không suy đoán đã chạy Linux CI; chưa push/tag. Đọc tệp đủ để review, không gom
toàn bộ node_modules/dist hay lịch sử. Hãy ưu tiên lỗi luật/logic, không style.
