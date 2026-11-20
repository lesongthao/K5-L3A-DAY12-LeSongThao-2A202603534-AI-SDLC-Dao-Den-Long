# Kiến trúc — Phase 2, Contract 1.1

## Thành phần

- src/core/: TypeScript thuần, types, seeded RNG, world, movement, systems, game,
  snapshot. Không DOM/fs/Three/Date/Math.random. Cấu hình truyền vào createGame.
- src/headless/: Node CLI đọc contract/scenario/inputs, validate chặt dữ liệu đã
  biết, nối tham số v1.0, viết JSONL. Không import browser. Exit 2 cho tệp sai.
- src/browser/: Three.js + HTML/CSS HUD, camera, input, render state. Dùng chung
  createGame/step/snapshot; accumulator 1/60s, render tách khỏi tick gameplay.
- tests/: Node test runner, spawn CLI thật, assert output/sự kiện/mã thoát;
  không dùng mock trả thành công. scripts/: verify và lưu bằng chứng.

## Giao diện lõi

createGame({seed:number,night:1|2|3,scenario?:Scenario,tuning:Tuning}):GameState
step(state:GameState,input:InputState):{state:GameState,events:GameEvent[]}
snapshot(state:GameState):ContractSnapshot

GameState giữ tick, state, initialTime, score, player pos/vertical velocity,
carried/flames/invulnerability, cooldown, last buttons, motes/shades/lanterns,
RNG/id counters và cờ random. Step được phép cập nhật state tại chỗ; UI không
tự cập nhật luật. Snapshot tạo object mới, làm tròn vị trí 3 số, không làm tròn
nội bộ. Snapshot gồm motes id/pos ngoài các trường bắt buộc.

## Build và CLI

Node >=22.12, ESM, strict TS. tsc -p tsconfig.node.json: rootDir src, outDir
dist/node; entry dist/node/headless/cli.js. Vite build ra dist/web. npm run build
thực hiện typecheck, build core/CLI và web. npm run preview phục vụ dist/web.
Core TypeScript dùng import .js tương thích NodeNext. Browser import contract
JSON bằng Vite; CLI đọc game.contract.json ở gốc repo. Lockfile được tạo thật
bằng npm install, không viết tay. npm run headless chỉ chạy Node CLI đã build.

CLI: --seed int --night 1|2|3 [--scenario file] [--inputs file] --ticks nonnegative-int
--out file [--snapshot-every positive-int,default10]. Unknown option/unsupported
night/invalid CLI -> exit2, lỗi I/O -> exit1; tệp JSON sai/schema sai -> exit2.
Snapshot tick0 luôn có; step k đọc input k và emit event tick k+1; snapshot
mỗi interval, cuối cùng end với ticks thực chạy. Tệp output stream từng dòng;
đóng và flush trước thoát. Không sleep/GPU. Tên event/data giữ đúng nguồn đề.
Input fields vắng giữ nguyên; ticks frame tăng nghiêm ngặt; nút cạnh lên xử lý
trong core để browser/headless giống nhau. Scenario update lantern theo id;
arrays thay toàn bộ, omitted dùng mặc định; bootstrap không event/điểm.

## Harness và kiểm chứng

npm test chạy node --test tests/*.test.mjs sau build core. npm run verify chạy
typecheck/build/test, sinh evidence và byte-compare deterministic output; lỗi
bất kỳ trả nonzero. CI Linux cài bằng npm ci và chạy verify. Ảnh thực từ browser,
ghi môi trường; không gọi Linux CI là đã đạt khi chưa có run thật.
Mỗi file code <=300 dòng. Giữ guide/rules/rubric/checkpoints/submission gốc.

## Cập nhật Ticket-02

`tick` đếm cả pause, `simTick` chỉ tăng khi gameplay chạy. Chú ý thứ tự
pipeline bắt buộc trong docs/PHASE2.md; timer/cooldown/TTL đều theo simTick.
Map surfaces là các mặt có độ cao; motion kiểm tra vách, ramp, tháp và landing.
Pad giữ launch velocity riêng, dash tạm ghi đè ngang và giữ cao khi ở trên không.
Chuỗi đêm ở browser chỉ cộng score của đêm won. Settings qua localStorage.
Audio tổng hợp WebAudio sau gesture; không cần asset âm thanh bên ngoài.
QA API chỉ có khi URL ?qa=1, dựng scenario rồi dùng phím thật; không ảnh hưởng CLI.
