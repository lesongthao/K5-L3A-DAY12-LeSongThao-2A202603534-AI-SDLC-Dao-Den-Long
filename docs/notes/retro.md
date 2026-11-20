# Báo Cáo Hồi Tưởng Dự Án (Retro & Evaluation) — Đảo Đèn Lồng

- **Học viên:** Lê Sông Thao (`lesongthao`) · **MSSV:** 2A202603534
- **Chương trình:** Khóa 5 Level 3 — Đào tạo AI Thực chiến VinUni & Vingroup
- **Dự án:** Game 3D Đảo Đèn Lồng qua 4 Phase (Contract v1.0 → v1.3)
- **Công cụ AI chính:** OpenAI Codex CLI (Kiến trúc sư & Thẩm định) & Google Antigravity (Kỹ sư triển khai)

---

## 1. Tổng Hợp Đánh Giá Qua 4 Phase (Evaluation)

| Phase | Mục tiêu chính | Kết quả đạt được | Hồi quy phase trước | Điều cần lưu ý |
|---|---|---|---|---|
| **Phase 1 (PRD-0)** | Core 60Hz, Đêm 1, Headless v1.0 | Tách sạch `src/core/` thuần TypeScript, tất định theo seed, không phụ thuộc DOM/Three.js | — | Sự cố mất kết nối dịch vụ Gemini khi chạy workflow `P1-CORE` -> Codex tiếp quản đúng lúc |
| **Phase 2 (Ticket-02)** | 3 đảo, dash, rơi, bùa, Gió Lạc, Contract v1.1 | Hoàn thiện map 3D, bệ phóng, gió lốc, review độc lập vá 5 lỗi biên IO/world (`review.test.mjs`) | Không; test Phase 1 bị thay luật đã cập nhật và giải thích trong `test-changes.md` | Cần đồng bộ bản vá sang cả 3 đảo & cầu tre |
| **Phase 3 (Ticket-03)** | Đèn cạn dầu, hút dầu, thắng Bình Minh, Contract v1.2 | Dùng `fuelTicks` (nguyên) tránh sai số float; hoàn thiện state machine `drain` & Colorblind mode | Không; mọi thay đổi từ `all_lit` sang `dawn_survived` có ADR-003 và `phase3.test.mjs` | Đồng nhất lại `18000` ticks Đêm 3 (300s) |
| **Phase 4 (Ticket-04)** | Benchmark, Soak, Leaderboard, Trợ năng, Sáng tạo, v1.0.0 | Vượt chuẩn 60 FPS với `InstancedMesh`, 0 crash soak test, đổi 9 phím, HUD thoáng + combat gậy/thanh máu | Không; toàn bộ phần sáng tạo (`combat.ts`, `cheats.ts`, `guide.ts`) tắt khi chạy headless/`?bench=1` | CI chạy trên Ubuntu (`verify.yml`); video demo `.mp4` quay sau khi đóng gói cuối |

---

## 2. Bài Học Khi Làm Việc Cùng Đa Tác Tử AI

### 2.1. Điều gì hiệu quả vượt trội?
1. **Phân chia vai trò rõ ràng (Codex Kiến trúc/Review ↔ Antigravity Triển khai/Kiểm chứng):** Codex rà soát độc lập để bắt lỗi biên (trùng ID, schema array, off-by-one `started` ở Gió Lạc), Antigravity viết code module hóa và kiểm chứng bằng CLI/Playwright.
2. **Quy tắc file `<= 300` dòng & tách lớp Core / Browser:** Giúp `src/core/` luôn tinh gọn, không bao giờ bị AI sửa bừa làm gãy Test Contract khi cải tiến đồ họa hay thêm cheat/combat ở lớp `src/browser/`.
3. **Kiểm chứng trực quan bằng ảnh chụp + assertion:** Kết hợp `npm run test:browser` chụp screenshot thật và đo bounding-box tránh hoàn toàn tình trạng "code chạy nhưng chữ đè nhau trên màn hình thật".

### 2.2. Những lần AI/Công cụ gặp lỗi và cách khắc phục
1. **Lỗi dịch vụ & quyền sandbox Phase 1–2:** Khi gọi workflow `P1-CORE`, dịch vụ Gemini bị lỗi mạng; lượt review read-only đầu thiếu tool đọc file. Cách xử lý: dừng tiến trình lỗi, không đánh dấu xong giả, đóng gói source gửi trực tiếp qua Artifact và lưu log lỗi `.runs/` để đối chiếu trung thực.
2. **Thay luật ở Phase 3 (`refuel` & trường nội bộ `eject`):** Test cũ kỳ vọng bấm `E` lần 2 vẫn báo `deposit`, nhưng Phase 3 chuyển sang `refuel`; đồng thời kiểm tra snapshot bắt được việc không để lộ biến nội bộ `eject` ra JSONL.
3. **Lỗi logic ẩn khi làm Bất tử & Bí Kíp (Phase 4):** AI ép `invuln` liên tục để làm bất tử vô tình kích hoạt hiệu ứng nhấp nháy tàng hình ở renderer, và đoạn khôi phục `carried` sau `step()` vô tình hoàn nhầm 3 đom đóm vừa dùng cho chiêu `Q`; đồng thời `<input type="checkbox">` giữ focus làm người chơi không bấm được `WASD`/`F9`. Cách xử lý: thay bằng `god-aura` dưới chân, chỉ hoàn `dropped` motes khi có event `player_hit`, tự `.blur()` sau khi đổi checkbox và khóa lại bằng test tự động trong `scripts/browser-check.mjs`.

---

## 3. Quản Lý Ngân Sách Token & Chi Phí
- **Chiến lược tiết kiệm token:** Giới hạn mọi file `<= 300` dòng; chạy gộp chuỗi lệnh build/test/verify trong một lượt; duy trì các tài liệu nén (`AGENTS.md`, `docs/PHASE*.md`, `docs/adr/003-*.md`) để không nạp lại log dài.
- **Ước tính token (Phase 3–4 & chuẩn hóa):** ~85.000 tokens (Phase 1–2 ban đầu không có số tổng chính xác từ phía công cụ ngoài nên ghi nhận minh bạch thay vì suy đoán).

---

## 4. Nếu Được Làm Lại Từ Đầu, Tôi Sẽ Thay Đổi Gì?
1. **Thiết kế layout HUD bằng Flexbox theo vùng ngay từ Phase 1:** Thay vì đặt `position: fixed/absolute` rời rạc cho từng thông báo, gom ngay theo cột/hàng Flex để không tốn công sửa chồng lấn khi thêm tính năng ở Phase 4.
2. **Tự động khởi động preview server bên trong `bench.mjs` và `browser-check.mjs` ngay từ đầu:** Tránh lỗi kết nối khi chạy lệnh đơn lẻ trên máy chấm của giảng viên.
