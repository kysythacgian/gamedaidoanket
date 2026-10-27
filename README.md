# Đại Đoàn Kết – bản Cloudflare, NHIỀU PHÒNG

Mỗi đơn vị có 1 phòng riêng (mã 5 ký tự): người chơi, TV, điểm và admin điều khiển **độc lập**, nhiều đơn vị chơi cùng lúc.

## Cách dùng
1. Admin mở `/admin.html`, nhập mã admin → màn hình **Quản lý phòng**.
2. Bấm **➕ TẠO PHÒNG** (đặt tên đơn vị) → ra mã phòng, ví dụ `K7M2Q`.
3. Mỗi phòng có nút:
   - **⚙️ Điều khiển** → `/admin.html?r=K7M2Q` (bắt đầu, tạo lượt, xoá người chơi…)
   - **📺 Mở TV** → `/tv.html?r=K7M2Q` (TV hiển thị mã phòng và link tham gia)
   - **📋 Chép link người chơi** → `/?r=K7M2Q` (gửi cho đơn vị; hoặc vào `/` rồi nhập mã phòng)
   - **🗑 Xoá** → xoá phòng, đá mọi người ra.

## Cấu hình
- `wrangler.toml` → `MAX_ROOMS` : số phòng tối đa (mặc định 10).
- `src/game.js` → `MAX` : số người chơi tối đa mỗi phòng (mặc định 50).

## Chạy thử / đưa lên Cloudflare
```
npm install
npm run dev          # http://localhost:8787/admin.html
npm run deploy       # lần đầu sẽ chạy thêm migration v2 (tạo Hub)
npx wrangler secret put ADMIN_KEY
```

## Cấu trúc
- `src/worker.js` – `Hub` (sổ đăng ký phòng), `Room` (mỗi phòng 1 Durable Object + WebSocket `/ws?r=MÃ`), API `/api/rooms`.
- `src/game.js` – luật chơi (không đổi).
- `public/` – giao diện; `common.js` đọc `?r=` và kết nối đúng phòng.

## Nên làm
- Đổi mã admin trong `.dev.vars` / secret; không dùng lại mã cũ.
- Xoá `public/CacTepCanThay.zip` (đang bị công khai trên website).

## Đưa lên GitHub rồi kết nối Cloudflare
Xem `docs/HuongDan_GitHub_Cloudflare.md` (GitHub + Cloudflare) và `docs/HuongDan_TaoPhong.md` (tạo phòng).
