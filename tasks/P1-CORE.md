# P1-CORE — Nền tảng và headless (Antigravity thực thi)

Đọc docs/PRD.md, docs/ARCHITECTURE.md, docs/source/PRD-0.txt, game.contract.json,
tests/contract.test.mjs và tests/helpers.mjs. Implement nền tảng core và CLI thật.
Không sửa docs/tests/contract, không chạy shell; toolkit tự cài và kiểm tra.

Mục tiêu task này: world 5 đèn, seeded RNG, scenario overlay đầy đủ, types,
movement camera-relative đúng chuẩn hóa, jump, timer, snapshot, input state
giữ trường/cạnh nút, CLI validation/output/end/error codes/determinism.
Hệ thống pickup/deposit/pulse/shade/hit/score/win sẽ nối ở task P1-RULES; có thể
implement ngay nếu gọn, nhưng ưu tiên không vượt 300 dòng/file. Core API đúng docs.

Tạo package ESM với three, devDependencies typescript/@types/node/@types/three/vite;
scripts build:core=tsc -p tsconfig.node.json; test:core=node --test tests/contract.test.mjs;
headless=node dist/node/headless/cli.js. npm test sau cùng là node --test tests/*.test.mjs.
Npm install do toolkit tạo lockfile thật. Chưa cần build web. Node compiler
rootDir src outDir dist/node; NodeNext, strict, .js imports, types node.

Đảm bảo validation schema trước khi chạy: frames array, strictly increasing
integer tick, move pair finite [-1,1], finite cam_yaw_deg, bool jump/interact/pulse;
scenario object với pos vector3 finite, các số nguyên >=0 cho carried/deposited,
flames >=0, bool flags/lit, arrays shapes, lantern ids L1..L5; shade id không trùng.
Scenario player/flames/carried giá trị phải được áp dụng không phát event/điểm.
Không clamp scenario tọa độ hay bỏ qua array rỗng. Chạy core chỉ xử lý island clamp
khi có movement, để scenario test được giữ nguyên tick0. Omitted player.pos=(0,0,0).
random flags false không có spawns; lists supplied thay default, không merge.
CLI không dùng Math.random hay thời gian thực. Chỉ snapshot rounding coords.

Hạn chế tổng code ~600 dòng để reviewer context <=32k. Không giả lập output.
Kết thúc báo file đã làm, phần chưa kiểm chứng; không tự nhận checks đã chạy.
