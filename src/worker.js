import { DurableObject } from "cloudflare:workers";
import { Game } from "./game.js";

const CODE_RE = /^[A-Z0-9]{4,8}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

// ===== Hub: sổ đăng ký các phòng (mỗi phòng = 1 đơn vị). Chỉ có đúng 1 Hub. =====
export class Hub extends DurableObject {
  async list() { return (await this.ctx.storage.get("rooms")) || []; }
  async get(code) { return (await this.list()).find(r => r.code === code) || null; }
  async create(name, max) {
    const rooms = await this.list();
    if (rooms.length >= max) return { err: `Đã đủ ${max} phòng. Hãy xoá phòng cũ trước khi tạo thêm.` };
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 cho dễ đọc
    let code;
    do { code = Array.from(crypto.getRandomValues(new Uint8Array(5)), b => alpha[b % alpha.length]).join(""); }
    while (rooms.some(r => r.code === code));
    const room = { code, name: String(name || "").trim().slice(0, 40) || "Đơn vị " + (rooms.length + 1), created: Date.now() };
    rooms.push(room);
    await this.ctx.storage.put("rooms", rooms);
    return { room };
  }
  async remove(code) {
    const rooms = await this.list(), left = rooms.filter(r => r.code !== code);
    if (left.length === rooms.length) return false;
    await this.ctx.storage.put("rooms", left);
    return true;
  }
}

// ===== Room: một phòng chơi độc lập (trạng thái + WebSocket riêng) =====
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong")); // giữ kết nối, không đánh thức DO
    ctx.blockConcurrencyWhile(async () => {
      const d = await ctx.storage.get(["s", "L", "code", "name"]);
      this.g = new Game(d.get("s"), d.get("L"), env.ADMIN_KEY);
      this.code = d.get("code") || ""; this.name = d.get("name") || "";
    });
  }

  vw() { return { ...this.g.view(), room: this.code, roomName: this.name }; }

  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("Cần WebSocket", { status: 426 });
    const code = req.headers.get("x-room") || "", name = decodeURIComponent(req.headers.get("x-room-name") || "");
    if (code && (code !== this.code || name !== this.name)) {
      this.code = code; this.name = name;
      await this.ctx.storage.put({ code, name });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify(this.vw())); // gửi ngay trạng thái hiện tại
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== "string" || data.length > 4000) return;
    let p; try { p = JSON.parse(data); } catch { return; }
    if (!p || typeof p !== "object") return;
    const r = this.g.act(p), v = this.vw();
    ws.send(JSON.stringify({ ...v, err: r.err, me: r.me, rejoin: r.rejoin, rid: p.rid })); // phản hồi riêng cho người gửi
    if (r.dirty) {
      await this.ctx.storage.put({ s: this.g.s, L: this.g.L });
      const m = JSON.stringify(v);
      for (const w of this.ctx.getWebSockets()) { try { w.send(m); } catch {} } // phát cho tất cả trong phòng này
    }
  }

  webSocketClose(ws, code) { try { ws.close(code); } catch {} }

  // Gọi khi admin xoá phòng: đá mọi người ra và xoá sạch dữ liệu
  async destroy() {
    for (const w of this.ctx.getWebSockets()) { try { w.close(4000, "Phòng đã bị xoá"); } catch {} }
    await this.ctx.storage.deleteAll();
    this.g = new Game(null, null, this.env.ADMIN_KEY); this.code = ""; this.name = "";
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), hub = env.HUB.get(env.HUB.idFromName("hub"));
    const maxRooms = Number(env.MAX_ROOMS) || 10;

    // WebSocket của 1 phòng: /ws?r=MÃ
    if (url.pathname === "/ws") {
      const code = (url.searchParams.get("r") || "").toUpperCase();
      if (!CODE_RE.test(code)) return new Response("Thiếu mã phòng", { status: 400 });
      const info = await hub.get(code);
      if (!info) return new Response("Phòng không tồn tại", { status: 404 });
      const h = new Headers(req.headers);
      h.set("x-room", code); h.set("x-room-name", encodeURIComponent(info.name));
      return env.ROOM.get(env.ROOM.idFromName(code)).fetch(new Request(req, { headers: h }));
    }

    // Công khai: kiểm tra mã phòng có tồn tại không (trang người chơi dùng)
    if (url.pathname === "/api/rooms/info") {
      const code = (url.searchParams.get("r") || "").toUpperCase();
      const info = CODE_RE.test(code) ? await hub.get(code) : null;
      return info ? json({ ok: true, code: info.code, name: info.name }) : json({ ok: false }, 404);
    }

    // Admin: danh sách / tạo / xoá phòng
    if (url.pathname === "/api/rooms" && req.method === "POST") {
      let b; try { b = await req.json(); } catch { return json({ err: "Dữ liệu sai" }, 400); }
      if (!env.ADMIN_KEY || b.k !== env.ADMIN_KEY) return json({ err: "Sai mã admin" }, 401);
      if (b.op === "list") return json({ rooms: await hub.list(), max: maxRooms });
      if (b.op === "create") {
        const r = await hub.create(b.name, maxRooms);
        return r.err ? json({ err: r.err }, 400) : json({ room: r.room, rooms: await hub.list(), max: maxRooms });
      }
      if (b.op === "delete") {
        const code = String(b.code || "").toUpperCase();
        if (!CODE_RE.test(code)) return json({ err: "Mã phòng sai" }, 400);
        if (await hub.remove(code)) await env.ROOM.get(env.ROOM.idFromName(code)).destroy();
        return json({ rooms: await hub.list(), max: maxRooms });
      }
      return json({ err: "Lệnh không hợp lệ" }, 400);
    }

    return new Response("Not found", { status: 404 }); // file tĩnh trong /public do Cloudflare tự phục vụ
  },
};
