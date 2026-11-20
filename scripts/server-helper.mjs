import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

/** Kiểm tra server đã chạy ở baseUrl chưa; nếu chưa thì tự bật vite preview cục bộ và trả về hàm dọn dẹp. */
export async function ensurePreviewServer(baseUrl) {
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(600) });
    if (res.ok || res.status < 500) return () => {};
  } catch { /* Server chưa chạy */ }

  const url = new URL(baseUrl);
  const port = url.port || (url.protocol === 'https:' ? '443' : '5173');
  const host = url.hostname || '127.0.0.1';
  const viteBin = resolve('node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', port, '--strictPort'], {
    stdio: 'ignore',
    windowsHide: true
  });

  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(500) });
      if (res.ok || res.status < 500) {
        return () => { if (!child.killed) child.kill(); };
      }
    } catch { /* Đợi server mở cổng */ }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!child.killed) child.kill();
  throw new Error(`Không khởi động được preview server tại ${baseUrl}`);
}
