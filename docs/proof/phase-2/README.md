# Bằng chứng Phase2 — Contract1.1

Các tệp được sinh bởi chương trình và công cụ trình duyệt thật, không sửa output.
`verification.json` và `browser-report.json` có cùng source_sha256 để đối chiếu.

| Nội dung | Bằng chứng |
|---|---|
| TypeScript strict, build web và CLI | build.log |
| 81 test, không bỏ qua | tests.log |
| Đủ21.600 bước <30giây | verification.json, night3-a.jsonl |
| Cùng seed/input/scenario giống từng byte | night3-a.jsonl, night3-b.jsonl, output_sha256 |
| Dash, pause, charm, drifter, fall, wind, launch | scenarios/ có input, scenario và output thực cho từng ca |
| UI/campaign/settings/pause | browser-report.json |
| FPS1280x720, ~60FPS trên Intel Iris Xe | browser-report.json, gồm GPU/CPU và thời lượng8giây |
| Cài/build/test từ thư mục sạch | clean-install.json, clean-install.log |
| Game3D, HUD và ba đêm | menu.png, night-1.png, night-2.png, night-3.png |
| Bình Minh, tổng điểm các đêm thắng | dawn.png, browser-report.json |

Đo headless đủ đêm dùng scenario yên tĩnh để không chết sớm; spawning/AI có
test riêng. FPS dùng cảnh thường Đêm3, có lịch sinh mặc định. Ảnh chiến thắng
dựng scenario bằng QA rồi bấm E thật; không phải video chơi tự nhiên từ đầu.

Môi trường local Windows, Node26, Edge157. CI Ubuntu chưa chạy trên GitHub.
Chưa có tag phase-2, commit/push hoặc video/Release cuối.
