import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

const LAN_PREFIXES = ["192.168.", "10."];
const SKIP_INTERFACES = /^(lo|docker|vboxnet|vmnet|utun|awdl|llw|bridge)/i;

function isLan(ip: string): boolean {
  return LAN_PREFIXES.some((p) => ip.startsWith(p));
}

/** Повертає локальну IPv4-адресу для доступу з телефону (тільки в dev). Пріоритет: 192.168.x.x, 10.x.x.x. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ url: null });
  }
  const nets = networkInterfaces();
  const candidates: { ip: string; isLan: boolean; name: string }[] = [];
  for (const name of Object.keys(nets)) {
    if (SKIP_INTERFACES.test(name)) continue;
    const list = nets[name];
    if (!list) continue;
    for (const net of list) {
      if (net.family === "IPv4" && !net.internal) {
        candidates.push({ ip: net.address, isLan: isLan(net.address), name });
      }
    }
  }
  // Спершу LAN (192.168, 10.), потім інші
  candidates.sort((a, b) => {
    if (a.isLan && !b.isLan) return -1;
    if (!a.isLan && b.isLan) return 1;
    if (a.isLan && b.isLan) return a.ip.startsWith("192.168.") ? -1 : 1;
    return 0;
  });
  const best = candidates[0];
  if (!best) return NextResponse.json({ url: null });
  return NextResponse.json({ url: `http://${best.ip}:3000`, ip: best.ip });
}
