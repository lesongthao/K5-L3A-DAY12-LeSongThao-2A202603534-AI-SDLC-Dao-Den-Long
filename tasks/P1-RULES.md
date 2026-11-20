# P1-RULES — Luật game dùng chung (Antigravity thực thi)

Đọc docs/PRD.md, docs/ARCHITECTURE.md, game.contract.json, tests/behavior.test.mjs,
tests/helpers.mjs và core hiện tại. Hoàn thiện tất cả luật trong PRD.
Không sửa tests, contract, CLI hay task, không chạy shell; toolkit chạy checks.

Pickup tự động khoảng cách XZ <= radius, capacity. Deposit cạnh nhấn, closest
unlit within radius, tie id, amount=min(carried,remaining), event deposit và
lantern_lit chỉ khi đầy. Pulse cạnh nhấn đủ carried và hết cooldown, trừ cost,
emit pulse stunned_ids, push 2m + stun2s, điểm per shade; không gây hit cùng tick.
Shade chase/hit, invuln90tick, lit safe radius cả khi đang stunned. Đồng tâm dùng +X.
Timers đếm theo tick không float accumulation gây drift. Events tick=state.tick.
Order và score đúng PRD; win ưu tiên loss; terminal state không step tiếp.
Random spawns flags đúng, 180tick mote/max60, 600tick shade/max6; deterministic
ids không trùng scenario. Initial spawns không events/điểm. Emit shade_spawned
chỉ cho spawns gameplay. Jump không miễn pickup/hit vì contract đo XZ.
Score victory bonus chỉ một lần, floor time, không thưởng loss.
Snapshot mọi lantern 5, shade tối thiểu stunned, include motes id/pos.
Giữ file <=300 dòng, code gọn; API cũ ổn định. Không tạo mock/test luôn xanh.
