# Nhật Ký Triển Khai & Sử Dụng AI (Phase 1 – Phase 4)

## Phase 1 & Phase 2 — Nền tảng Core, 3 Đảo & Review Độc lập (Contract v1.0 → v1.1)
- Codex đọc 6 tài liệu gốc, `PRD-0` và `Ticket-02`, chuẩn bị đặc tả và bộ test nền.
- Có gọi workflow `P1-CORE`: Codex lập kế hoạch thành công; bước chạy Gemini gặp lỗi kết nối dịch vụ Google nhiều lần trước khi tạo mã nên đã dừng cây tiến trình để tránh treo, không coi workflow là `DONE`. Bằng chứng lỗi giữ cục bộ tại `.runs/P1-CORE-cea49bb0` (đã loại khỏi git).
- Codex tiếp quản triển khai lõi Phase 1–2; cập nhật test công khai trong `docs/PHASE2.md` và `docs/notes/test-changes.md` khi Ticket-02 thay luật cũ.
- Chạy reviewer Codex độc lập qua `agent_exchange` (read-only): lượt đầu thiếu quyền đọc file/shell nên không kết luận; lượt sau chia source theo nhóm logic/IO dưới 32k ký tự gửi qua Artifact. 5 phát hiện IO/gameplay được vá kèm regression tests trong `tests/review.test.mjs` và ghi trong `docs/notes/review.md`.
- Kết thúc Phase 2 đạt 81/81 Node tests, clean install, ~60 FPS ở `1280x720`; log lưu tại `docs/proof/phase-2/`.

## Phase 3 — Đèn Cạn Dầu (Ticket-03, Contract v1.2)
- Antigravity đọc `docs/PHASE3.md` và `docs/adr/003-fuel-decay-and-win-condition.md`, triển khai cơ chế nhiên liệu đèn (`fuelTicks` nguyên 1/60s tránh sai số dấu phẩy động), thắp lại (`relight_cost: 5`), trạng thái `drain` của Bóng Mực, sức chứa động `10..20`, luật thắng Bình Minh `>= ceil(0.6 * N)` đèn sáng và chế độ Colorblind.
- Cập nhật các assert Phase 2 bị Ticket-03 thay thế (`all_lit` → `dawn_survived`, thời lượng Đêm 1 `300s` → `240s`, điểm nạp đom đóm) có bảng giải thích minh bạch trong `docs/notes/test-changes.md`, đồng thời thêm bộ test `tests/phase3.test.mjs` (P3-01 → P3-10).

## Phase 4 — Phát Hành v1.0.0, Đồ Họa Nâng Cao & Chuẩn Hóa (Ticket-04, Contract v1.3)
- Bổ sung chế độ Benchmark (`scripts/bench.mjs`, 200 Bóng Mực + 100 Đom đóm với `InstancedMesh`), Soak Test 10 đêm (`scripts/soak.mjs`), Bảng xếp hạng Top 10 (`leaderboard.ts` + CLI `--export-leaderboard`), trợ năng (đổi 9 phím, chữ lớn x1.25, reduced motion, chỉ báo thị giác) và bộ test `tests/phase4.test.mjs`.
- Phát triển lớp sáng tạo trên trình duyệt hoàn toàn độc lập với `src/core/` và tắt khi chạy headless/`?bench=1`:
  - Đồ họa PBR & GLSL Shader thủ công (bầu trời chuyển rạng đông, trăng sao, biển mây FBM, đồng cỏ gió thổi, bé Mây nón lá cầm gậy phép trăng khuyết).
  - Nhạc nền ngũ cung + hiệu ứng âm thanh tổng hợp thời gian thực qua Web Audio API (`ambience.ts`, `audio.ts`).
  - Giao diện mở đầu dạng Tab, Bí Kíp Ông Đăng (`F9`), chỉ dẫn từng bước theo ngữ cảnh (`guide.ts`), thanh máu 3 đốt trên đầu Bóng Mực (đánh 3 gậy hoặc `Q` hạ ngay, hồi sinh sau 20s trong `combat.ts`) và bố cục Flexbox chống chồng lấn HUD ở `1280x640`.
- Kiểm tra phát hiện & vá lỗi thực tế: phát hiện `godMode` cũ ép `invuln` gây nhấp nháy nhân vật và hoàn nhầm đom đóm khi bấm `Q`; checkbox Bí Kíp giữ focus chặn phím `WASD`/`Q`/`F9`; HUD đè chữ trên laptop `1280x640`. Đã sửa triệt để và khóa lại bằng assert tự động trong `scripts/browser-check.mjs`.

## Quản lý Token & Chi phí
- Không có bộ đếm chính xác tổng token cho toàn bộ phiên Phase 1–2 ở phía ngoài harness nên giữ ghi nhận trung thực (ước tính cả dự án ~85.000 tokens ở giai đoạn làm sạch + tối ưu).
- Cách tiết kiệm: giữ file `<= 300` dòng để không phải đọc file khổng lồ lặp lại; gộp chuỗi kiểm tra `build; test; verify` vào một lệnh shell; tham chiếu `docs/PHASE*.md` và `ADR` thay cho prompt dài.
