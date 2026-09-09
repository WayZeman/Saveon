"use client";

import { useEffect, useRef } from "react";
import { rgba, TYPE_COLORS } from "@/lib/cortex/colors";
import type { AssetType, PortfolioSnapshot, ValuedInvestment } from "@/lib/cortex/types";
import { TYPE_LABELS } from "@/lib/cortex/types";

type Kind = "core" | "group" | "asset";

type GraphNode = {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  ox: number;
  oy: number;
  r: number;
  kind: Kind;
  parentId?: string;
  color: string;
  active: boolean;
  phase: number;
  daily?: number;
  weight?: number;
  costUsd?: number;
  pnlUsd?: number;
  pnlPct?: number;
  since?: string;
};

import { formatUsd } from "@/lib/cortex/money";

function graphName(name: string, groupLabel?: string, symbol?: string | null) {
  const ticker = symbol?.replace(/\.[A-Z]{1,4}$/i, "") ?? "";
  if (ticker) return ticker;
  let label = name
    .replace(/\s*[·•|]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4}/g, "")
    .replace(/\s+\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*$/g, "")
    .trim();
  if (groupLabel && label.toLowerCase().startsWith(groupLabel.toLowerCase())) {
    label = label.slice(groupLabel.length).replace(/^[\s·•\-]+/, "").trim();
  }
  return label || groupLabel || name;
}

function formatUkDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

function earliestDate(items: ValuedInvestment[]) {
  if (!items.length) return "";
  return items.reduce((min, item) => (item.purchaseDate < min ? item.purchaseDate : min), items[0].purchaseDate);
}

function formatPct(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function compactUsd(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = Math.round((abs / 1000) * 10) / 10;
    return `${sign}$${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sign}$${abs.toFixed(abs >= 100 ? 0 : 2)}`;
}

function chordWidth(radius: number, dy: number) {
  const inner = radius * 0.9;
  return 2 * Math.sqrt(Math.max(4, inner * inner - dy * dy));
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

type LabelLine = {
  text: string;
  color: string;
  weight?: 500 | 600 | 700;
};

function drawCenteredLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  lines: LabelLine[],
  darkShadow = true,
) {
  const parts = lines.filter((line) => line.text);
  if (!parts.length) return;
  const clipR = Math.max(4, radius - (radius > 50 ? 6 : 3));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, clipR, 0, Math.PI * 2);
  ctx.clip();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const font = `Inter, "SF Pro Text", "Segoe UI", system-ui, sans-serif`;
  const maxSize = Math.min(
    radius > 90 ? 18 : radius > 50 ? 16 : 15,
    (clipR * (parts.length >= 3 ? 1.7 : 2.05)) / Math.max(2, parts.length),
  );
  const titleLong = (parts[0]?.text.length ?? 0) > 8;
  let fitSizes = parts.map((_, i) => Math.max(9, maxSize * (i === 0 && titleLong ? 0.82 : 0.55)));
  let fitYs = parts.map((_, i) => (i - (parts.length - 1) / 2) * 12);
  let fitted = false;

  for (let scale = 1; scale >= 0.62; scale -= 0.03) {
    const sizes = parts.map((_, i) => {
      const factor = i === 0 ? (titleLong ? 0.92 : 1.05) : 0.92;
      return Math.max(9, maxSize * factor * scale);
    });
    const lhs = sizes.map((size) => size * 1.08);
    const gap = 1.35;
    const block = lhs.reduce((sum, height) => sum + height, 0) + gap * (parts.length - 1);
    if (block > clipR * 1.78) continue;
    let cursor = -block / 2;
    const ys: number[] = [];
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const cy = cursor + lhs[i] / 2;
      ys.push(cy);
      ctx.font = `${parts[i].weight ?? 600} ${sizes[i]}px ${font}`;
      if (ctx.measureText(parts[i].text).width > chordWidth(clipR, cy) - 2) ok = false;
      cursor += lhs[i] + gap;
    }
    fitSizes = sizes;
    fitYs = ys;
    if (!ok) continue;
    fitted = true;
    break;
  }

  ctx.shadowColor = darkShadow ? "rgba(0,0,0,0.9)" : "rgba(46,16,101,0.2)";
  ctx.shadowBlur = darkShadow ? 8 : 0;
  ctx.shadowOffsetY = darkShadow ? 1 : 0;
  for (let i = 0; i < parts.length; i++) {
    ctx.fillStyle = parts[i].color;
    ctx.font = `${parts[i].weight ?? 600} ${fitSizes[i]}px ${font}`;
    const maxW = chordWidth(clipR, fitYs[i]) - 2;
    ctx.fillText(fitted ? parts[i].text : ellipsize(ctx, parts[i].text, maxW), x, y + fitYs[i]);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();
}

function layout(w: number, h: number, snapshot: PortfolioSnapshot): GraphNode[] {
  const compact = w < 720;
  const scale = compact ? Math.min(1, Math.max(0.55, Math.min(w, h) / 520)) : 1;
  const span = Math.min(w, h);
  const types: Exclude<AssetType, "other">[] = ["crypto", "stock", "real_estate", "bond"];
  const sector = (Math.PI * 2) / types.length;
  const origin = -Math.PI / 2 + 0.18;
  const up = snapshot.totals.pnlUsd >= 0;
  const groupR = 118 * scale;
  const coreR = 64 * scale;
  const inner = Math.max(span * (compact ? 0.24 : 0.28), coreR + groupR + 36 * scale);

  const core: GraphNode = {
    id: "core",
    label: "Капітал",
    sub: formatUsd(snapshot.totals.currentUsd),
    x: 0,
    y: 0,
    ox: 0,
    oy: 0,
    r: coreR,
    kind: "core",
    color: up ? "#4ade80" : "#f87171",
    active: true,
    phase: 0,
  };

  const groups = types.map((type, i) => {
    const items = snapshot.groups[type];
    const base = origin + i * sector;
    const angle = base + sector / 2;
    const x = Math.cos(angle) * inner;
    const y = Math.sin(angle) * inner;
    const weight = items.reduce((sum, item) => sum + item.currentUsd, 0);
    const cost = items.reduce((sum, item) => sum + item.costUsd, 0);
    const pnl = items.reduce((sum, item) => sum + item.pnlUsd, 0);
    const pnlPct = cost === 0 ? 0 : (pnl / cost) * 100;
    const first = earliestDate(items);
    return {
      id: `g-${type}`,
      label: TYPE_LABELS[type],
      sub: items.length ? formatPct(pnlPct) : "",
      since: first ? `з ${formatUkDate(first)}` : undefined,
      x,
      y,
      ox: x,
      oy: y,
      r: items.length ? groupR : Math.max(12, 16 * scale),
      kind: "group" as const,
      parentId: "core",
      color: TYPE_COLORS[type],
      active: items.length > 0,
      phase: i * 1.2,
      angle,
      base,
      items,
      weight,
      costUsd: cost,
      pnlUsd: pnl,
      pnlPct,
    };
  });

  const maxAsset = Math.max(1, ...groups.flatMap((g) => g.items.map((i) => i.currentUsd)));
  const assets: GraphNode[] = [];
  for (const group of groups) {
    const items = [...group.items].sort((a, b) => b.currentUsd - a.currentUsd);
    const count = items.length;
    if (!count) continue;
    const ringCount = count > 8 ? 3 : count > 3 ? 2 : 1;
    const sizes = Array.from({ length: ringCount }, (_, ring) => {
      const base = Math.floor(count / ringCount);
      const extra = count % ringCount;
      return base + (ring >= ringCount - extra ? 1 : 0);
    });
    const pad = 0.2;
    const sweep = sector - pad * 2;
    let index = 0;
    let lastRadius = inner + groupR + 12 * scale;
    sizes.forEach((slots) => {
      if (!slots) return;
      const slice = items.slice(index, index + slots);
      const rs = slice.map((item) => (36 + Math.sqrt(item.currentUsd / maxAsset) * 6) * scale);
      const maxR = Math.max(...rs);
      const theta = slots === 1 ? sweep : sweep / slots;
      const gap = 22 * scale;
      const minChord = 2 * maxR + gap;
      const need = slots <= 1 ? lastRadius + maxR + gap : minChord / (2 * Math.sin(Math.max(theta / 2, 0.05)));
      const radius = Math.max(lastRadius + maxR + gap, need);
      slice.forEach((item, slot) => {
        const t = slots === 1 ? 0.5 : (slot + 0.5) / slots;
        const ang = group.base + pad + t * sweep;
        const x = Math.cos(ang) * radius;
        const y = Math.sin(ang) * radius;
        assets.push({
          id: item.id,
          label: graphName(item.name, TYPE_LABELS[group.id.replace("g-", "") as AssetType], item.symbol),
          x,
          y,
          ox: x,
          oy: y,
          r: rs[slot],
          kind: "asset",
          parentId: group.id,
          color: item.pnlPct >= 0 ? group.color : "#f87171",
          active: true,
          phase: index + slot + group.phase,
          daily: item.dailyIncomeUsd,
          weight: item.currentUsd,
          pnlPct: item.pnlPct,
          since: item.purchaseDate ? `з ${formatUkDate(item.purchaseDate)}` : undefined,
        });
      });
      lastRadius = radius + maxR;
      index += slots;
    });
  }

  const nodes = [core, ...groups.map(({ angle: _a, base: _b, items: _i, ...node }) => node), ...assets];
  radialSeparate(nodes);
  return nodes;
}

function radialSeparate(nodes: GraphNode[]) {
  for (let pass = 0; pass < 14; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.kind === "core" || b.kind === "core") continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const min = a.r + b.r + 12;
        if (dist >= min) continue;
        const aOut = Math.hypot(a.x, a.y);
        const bOut = Math.hypot(b.x, b.y);
        const outer = aOut >= bOut ? a : b;
        const inner = outer === a ? b : a;
        const ang = Math.atan2(outer.y, outer.x);
        const push = min - dist + 3;
        outer.x += Math.cos(ang) * push;
        outer.y += Math.sin(ang) * push;
        outer.ox = outer.x;
        outer.oy = outer.y;
        if (inner.kind === "asset" && outer.kind === "group") {
          const away = Math.atan2(inner.y - outer.y, inner.x - outer.x);
          inner.x += Math.cos(away) * (push * 0.35);
          inner.y += Math.sin(away) * (push * 0.35);
          inner.ox = inner.x;
          inner.oy = inner.y;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

type Pulse = { fromId: string; toId: string; t: number; speed: number; color: string; size: number };

export function Cortex({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: PortfolioSnapshot;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedRef = useRef(selectedId);
  const snapshotRef = useRef(snapshot);
  selectedRef.current = selectedId;
  snapshotRef.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let visible = document.visibilityState !== "hidden";
    let raf = 0;
    let w = 0;
    let h = 0;
    let nodes: GraphNode[] = [];
    let pulses: Pulse[] = [];
    const compact = () => w > 0 && w < 720;
    const starCount = window.matchMedia("(max-width: 719px)").matches ? 36 : 110;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      a: 0.06 + Math.random() * 0.32,
      s: 0.45 + Math.random() * 1.2,
      p: Math.random() * Math.PI * 2,
    }));
    const cam = { x: 0, y: 0, k: 1 };
    let dragging = false;
    let dragNode = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let hoverId: string | null = null;
    let pinchStart = 0;
    let pinchScale = 1;
    const time = { t: 0 };
    const tapSlop = () => (window.matchMedia("(pointer: coarse)").matches ? 14 : 5);
    const hitPad = () => (window.matchMedia("(pointer: coarse)").matches ? 14 : 6);

    const toWorld = (sx: number, sy: number) => ({
      x: (sx - w / 2) / cam.k + cam.x,
      y: (sy - h / 2) / cam.k + cam.y,
    });

    const hit = (sx: number, sy: number) => {
      const p = toWorld(sx, sy);
      return [...nodes].reverse().find((n) => Math.hypot(n.x - p.x, n.y - p.y) <= n.r + hitPad() / cam.k);
    };

    const makePulses = (list: GraphNode[]): Pulse[] =>
      list
        .filter((n) => n.parentId && n.active)
        .flatMap((n) => {
          const count = n.kind === "group" ? 2 : n.daily ? 2 : 1;
          return Array.from({ length: count }, (_, i) => ({
            fromId: n.id,
            toId: n.parentId as string,
            t: (i / count + Math.random()) % 1,
            speed: (n.daily ? 0.0065 : 0.0032) + Math.random() * 0.0035,
            color: n.color,
            size: n.daily ? 2.6 : 1.7,
          }));
        });

    const rebuild = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, compact() ? 2 : 2.5);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = layout(w, h, snapshotRef.current);
      pulses = makePulses(nodes);
      const reach = Math.max(
        120,
        ...nodes.map((node) => Math.hypot(node.ox, node.oy) + node.r + 52),
      );
      const chrome = compact() ? 168 : 120;
      const usable = Math.min(w * (compact() ? 0.94 : 1), Math.max(220, h - chrome));
      cam.k = Math.min(compact() ? 1.55 : 1.25, Math.max(0.4, (usable * 0.48) / reach));
      cam.x = 0;
      cam.y = compact() ? -8 : 10;
    };

    rebuild();
    const observer = new ResizeObserver(rebuild);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    let stamp = snapshotRef.current.updatedAt;

    const rim = (from: GraphNode, to: GraphNode) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const gap = 2.5;
      return {
        a: { x: from.x + (dx / len) * (from.r + gap), y: from.y + (dy / len) * (from.r + gap) },
        b: { x: to.x - (dx / len) * (to.r + gap), y: to.y - (dy / len) * (to.r + gap) },
      };
    };

    const drawLink = (from: GraphNode, to: GraphNode, color: string, width: number, alpha: number) => {
      const ends = rim(from, to);
      ctx.beginPath();
      ctx.moveTo(ends.a.x, ends.a.y);
      ctx.lineTo(ends.b.x, ends.b.y);
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = width / cam.k;
      ctx.lineCap = "round";
      ctx.stroke();
    };

    const clipAroundNodes = () => {
      ctx.beginPath();
      ctx.rect(-8000, -8000, 16000, 16000);
      for (const node of nodes) {
        ctx.moveTo(node.x + node.r + 2.8, node.y);
        ctx.arc(node.x, node.y, node.r + 2.8, 0, Math.PI * 2);
      }
      ctx.clip("evenodd");
    };

    const draw = () => {
      if (!running) return;
      if (!visible) {
        raf = 0;
        return;
      }
      if (snapshotRef.current.updatedAt !== stamp) {
        stamp = snapshotRef.current.updatedAt;
        nodes = layout(w, h, snapshotRef.current);
        pulses = makePulses(nodes);
      }
      time.t += compact() ? 0.75 : 1;

      const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.52, Math.max(w, h) * 0.78);
      bg.addColorStop(0, "#161226");
      bg.addColorStop(0.42, "#0e0c16");
      bg.addColorStop(1, "#05040a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(cam.k, cam.k);
      ctx.translate(-cam.x, -cam.y);

      for (const star of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time.t * 0.018 + star.p));
        ctx.fillStyle = `rgba(230,220,255,${star.a * tw})`;
        ctx.beginPath();
        ctx.arc(star.x * Math.max(w, h) * 0.58, star.y * Math.max(w, h) * 0.58, star.s / cam.k, 0, Math.PI * 2);
        ctx.fill();
      }

      const byId = new Map(nodes.map((n) => [n.id, n]));
      const selected = selectedRef.current ?? hoverId;
      const chain = new Set<string>();
      if (selected) {
        let cur: GraphNode | undefined = byId.get(selected);
        while (cur) {
          chain.add(cur.id);
          cur = cur.parentId ? byId.get(cur.parentId) : undefined;
        }
        for (const node of nodes) {
          if (node.parentId && chain.has(node.parentId) && node.kind === "asset" && selected.startsWith("g-")) {
            chain.add(node.id);
          }
        }
      }

      const live = snapshotRef.current;
      const drip =
        live.totals.dailyIncomeUsd *
        Math.max(0, (Date.now() - new Date(live.updatedAt).getTime()) / 86_400_000);
      const coreLive = nodes.find((n) => n.kind === "core");
      if (coreLive) coreLive.sub = formatUsd(live.totals.currentUsd + drip);

      for (const node of nodes) {
        node.x = node.ox;
        node.y = node.oy;
      }

      ctx.save();
      clipAroundNodes();
      for (const node of nodes) {
        if (!node.parentId) continue;
        const parent = byId.get(node.parentId);
        if (!parent) continue;
        const focused = chain.size === 0 || (chain.has(node.id) && chain.has(parent.id));
        const lit = chain.has(node.id) && chain.has(parent.id);
        ctx.save();
        ctx.globalAlpha = focused ? 1 : 0.22;
        drawLink(
          node,
          parent,
          node.color,
          node.kind === "asset" ? 1.5 : 3,
          lit ? 0.95 : node.kind === "asset" ? 0.55 : 0.88,
        );
        ctx.restore();
      }

      ctx.globalCompositeOperation = "lighter";
      for (const pulse of pulses) {
        const from = byId.get(pulse.fromId);
        const to = byId.get(pulse.toId);
        if (!from || !to) continue;
        const focused = chain.size === 0 || (chain.has(from.id) && chain.has(to.id));
        pulse.t += pulse.speed;
        if (pulse.t > 1) pulse.t -= 1;
        const t = pulse.t * pulse.t * (3 - 2 * pulse.t);
        const ends = rim(from, to);
        const p = {
          x: ends.a.x + (ends.b.x - ends.a.x) * t,
          y: ends.a.y + (ends.b.y - ends.a.y) * t,
        };
        const prev = Math.max(0, t - 0.045);
        const trail = {
          x: ends.a.x + (ends.b.x - ends.a.x) * prev,
          y: ends.a.y + (ends.b.y - ends.a.y) * prev,
        };
        ctx.globalAlpha = focused ? 0.55 : 0.1;
        ctx.strokeStyle = pulse.color;
        ctx.lineWidth = (pulse.size * 0.7) / cam.k;
        ctx.beginPath();
        ctx.moveTo(trail.x, trail.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulse.size / cam.k, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = focused ? 0.95 : 0.12;
        ctx.fill();
      }
      ctx.restore();

      for (const node of nodes) {
        const isSel = selected === node.id;
        const focused = chain.size === 0 || chain.has(node.id);
        ctx.save();
        ctx.globalAlpha = focused ? 1 : 0.22;

        if (node.kind === "core") {
          const pulse = 1 + Math.sin(time.t * 0.032) * 0.07;
          const aura = ctx.createRadialGradient(0, 0, node.r * 0.3, 0, 0, node.r * 2.1);
          aura.addColorStop(0, "rgba(196,181,253,0.12)");
          aura.addColorStop(0.5, "rgba(124,58,237,0.05)");
          aura.addColorStop(1, "rgba(124,58,237,0)");
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(0, 0, node.r * 2.1 * pulse, 0, Math.PI * 2);
          ctx.fill();

          for (let i = 3; i >= 1; i--) {
            ctx.beginPath();
            ctx.arc(0, 0, (node.r + 8 * i) * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(196,181,253,${0.07 / i})`;
            ctx.lineWidth = 1 / cam.k;
            ctx.stroke();
          }

          for (let i = 0; i < 6; i++) {
            const ang = time.t * 0.008 + (i / 6) * Math.PI * 2;
            const orbit = node.r + 16;
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * orbit, Math.sin(ang) * orbit, 1.1 / cam.k, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(196,181,253,0.45)";
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(node.x - 12, node.y - 14, 6, node.x, node.y, node.r);
          grad.addColorStop(0, "#f5f3ff");
          grad.addColorStop(0.38, "#c4b5fd");
          grad.addColorStop(0.78, "#7c3aed");
          grad.addColorStop(1, "#3b0764");
          ctx.fillStyle = grad;
          ctx.shadowColor = "#a78bfa";
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.62)";
          ctx.lineWidth = 1.6 / cam.k;
          ctx.stroke();

          drawCenteredLabel(ctx, node.x, node.y, node.r, [
            { text: node.label, color: "#2e1065", weight: 600 },
            { text: node.sub ?? "", color: "#1e1b4b", weight: 700 },
          ], false);
          ctx.restore();
          continue;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + (isSel ? 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = "#07060b";
        ctx.fill();
        ctx.lineWidth = (node.kind === "group" ? 2.4 : 1.7) / cam.k;
        ctx.strokeStyle = node.active ? rgba(node.color, isSel ? 1 : 0.9) : "#5a5a5a";
        ctx.stroke();
        if (isSel) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1.2 / cam.k;
          ctx.stroke();
        }

        if (node.active) {
          const up = (node.pnlPct ?? 0) >= 0;
          const pctColor = up ? "#4ade80" : "#f87171";
          const lines: LabelLine[] = [{ text: node.label, color: "#ffffff", weight: 600 }];
          if (node.kind === "group") {
            if (node.since) lines.push({ text: node.since, color: "rgba(212,212,216,0.88)", weight: 500 });
            if (node.costUsd != null) lines.push({ text: compactUsd(node.costUsd), color: "#ffffff", weight: 600 });
            const pnlBits: string[] = [];
            if (node.pnlUsd != null) {
              const sign = node.pnlUsd >= 0 ? "+" : "";
              pnlBits.push(`${sign}${compactUsd(Math.abs(node.pnlUsd))}`);
            }
            if (node.pnlPct != null) pnlBits.push(formatPct(node.pnlPct));
            if (pnlBits.length) lines.push({ text: pnlBits.join("  "), color: pctColor, weight: 700 });
          } else {
            if (node.since) lines.push({ text: node.since, color: "rgba(212,212,216,0.88)", weight: 500 });
            if (node.pnlPct != null) lines.push({ text: formatPct(node.pnlPct), color: pctColor, weight: 700 });
          }
          drawCenteredLabel(ctx, node.x, node.y, node.r, lines);
        }
        ctx.restore();
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      if (dragging && !dragNode) {
        if (Math.hypot(sx - lastX, sy - lastY) > 2) moved = true;
        cam.x -= (sx - lastX) / cam.k;
        cam.y -= (sy - lastY) / cam.k;
        lastX = sx;
        lastY = sy;
        return;
      }
      const node = hit(sx, sy);
      hoverId = node?.id ?? null;
      canvas.style.cursor = dragging ? "grabbing" : node ? "pointer" : "grab";
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" && (event as PointerEvent & { isPrimary?: boolean }).isPrimary === false) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      lastX = event.clientX - rect.left;
      lastY = event.clientY - rect.top;
      moved = false;
      dragNode = Boolean(hit(lastX, lastY));
      dragging = !dragNode;
      canvas.setPointerCapture(event.pointerId);
    };

    const onUp = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const dist = Math.hypot(sx - lastX, sy - lastY);
      const node = hit(sx, sy);
      if (!moved && dist < tapSlop()) {
        if (node) onSelect(node.kind === "core" ? null : node.id);
        else onSelect(null);
      }
      dragging = false;
      dragNode = false;
      moved = false;
    };

    const zoomAt = (sx: number, sy: number, factor: number) => {
      const before = toWorld(sx, sy);
      cam.k = Math.min(3.2, Math.max(0.38, cam.k * factor));
      const after = toWorld(sx, sy);
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, event.deltaY > 0 ? 0.92 : 1.08);
    };

    const touchDist = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        pinchStart = touchDist(event.touches);
        pinchScale = cam.k;
        dragging = false;
        dragNode = false;
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchStart > 0) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
        const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;
        const next = pinchScale * (touchDist(event.touches) / pinchStart);
        const before = toWorld(midX, midY);
        cam.k = Math.min(3.2, Math.max(0.38, next));
        const after = toWorld(midX, midY);
        cam.x += before.x - after.x;
        cam.y += before.y - after.y;
      }
    };

    const onTouchEnd = () => {
      if (pinchStart) pinchStart = 0;
    };

    const onVisibility = () => {
      visible = document.visibilityState !== "hidden";
      if (visible && running && !raf) raf = requestAnimationFrame(draw);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [onSelect]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none select-none"
      style={{ touchAction: "none" }}
    />
  );
}
