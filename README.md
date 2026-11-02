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


## Nâng cấp chế độ “Tất cả cùng chơi”
- Điện thoại đếm ngược 3–2–1 trước khi quay; xe quay 7,5 giây, nhiều vòng hơn và giảm tốc rõ ở cuối.
- Khi xe dừng, mỗi người trả lời câu hỏi riêng trên điện thoại; TV hiển thị câu hỏi/đáp án mới nhất để khán giả cùng theo dõi.
- Khi tất cả người chơi hoàn thành 10 câu, điện thoại hiện bảng xếp hạng; TV hiển thị bảng chung cuộc theo điểm.
- Các tệp đã chỉnh: `src/game.js`, `public/index.html`, `public/common.js`, `public/tv.html`. Chế độ lần lượt và phần quản trị/phòng chơi được giữ nguyên.

## Cấu hình
- `wrangler.toml` → `MAX_ROOMS` : số phòng tối đa (mặc định 10).
- `src/game.js` → `MAX` : số người chơi tối đa mỗi phòng (mặc định 10; nhận từ 1 đến 10 người, người thứ 11 bị chặn).

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
