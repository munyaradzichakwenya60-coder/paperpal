import { useId } from "react";
import type { Diagram as DiagramData } from "../types";
import { compileExpr } from "../lib/mathexpr";

const INK = "#111";
const FONT = "Georgia, 'Times New Roman', serif";
const DASH = "5 4";

type TProps = { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; size?: number; italic?: boolean };
function T({ x, y, children, anchor = "middle", size = 13, italic = false }: TProps) {
  return <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={size} fontFamily={FONT} fontStyle={italic ? "italic" : "normal"} fill={INK} stroke="#fff" strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">{children}</text>;
}
const line = (x1: number, y1: number, x2: number, y2: number, dashed = false, w = 1.5) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={w} strokeDasharray={dashed ? DASH : undefined} />
);
const path = (d: string, dashed = false, w = 1.5) => <path d={d} fill="none" stroke={INK} strokeWidth={w} strokeDasharray={dashed ? DASH : undefined} />;
/** A measurement line with small end ticks. */
function Dim({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 4, ny = (dx / len) * 4;
  return <g stroke={INK} strokeWidth="1">{line(x1, y1, x2, y2, false, 1)}{line(x1 - nx, y1 - ny, x1 + nx, y1 + ny, false, 1)}{line(x2 - nx, y2 - ny, x2 + nx, y2 + ny, false, 1)}</g>;
}

// ── Solids ──────────────────────────────────────────────────────────────────
export function Solid({ d }: { d: Extract<DiagramData, { type: "solid" }> }) {
  const label = `${d.shape} diagram`;
  let body: React.ReactNode = null;

  if (d.shape === "cylinder") {
    body = (
      <>
        <ellipse cx="150" cy="52" rx="64" ry="16" fill="none" stroke={INK} strokeWidth="1.5" />
        {line(86, 52, 86, 182)}{line(214, 52, 214, 182)}
        {path("M86 182 A64 16 0 0 0 214 182")}{path("M86 182 A64 16 0 0 1 214 182", true)}
        {d.radius && <>{line(150, 52, 214, 52, true)}<T x={222} y={52} anchor="start">{d.radius}</T></>}
        {d.diameter && <>{line(86, 182, 214, 182, true)}<T x={150} y={214}>{d.diameter}</T></>}
        {d.height && <><Dim x1={276} y1={52} x2={276} y2={182} /><T x={286} y={117} anchor="start">{d.height}</T></>}
      </>
    );
  } else if (d.shape === "cone") {
    body = (
      <>
        {line(150, 22, 80, 180)}{line(150, 22, 220, 180)}
        {path("M80 180 A70 17 0 0 0 220 180")}{path("M80 180 A70 17 0 0 1 220 180", true)}
        {d.height && <>{line(150, 22, 150, 180, true)}<T x={142} y={100} anchor="end">{d.height}</T></>}
        {d.radius && <>{line(150, 180, 220, 180, true)}<T x={228} y={180} anchor="start">{d.radius}</T></>}
        {d.diameter && <>{line(80, 180, 220, 180, true)}<T x={150} y={212}>{d.diameter}</T></>}
        {d.slantHeight && <T x={198} y={92} anchor="start">{d.slantHeight}</T>}
      </>
    );
  } else if (d.shape === "sphere") {
    body = (
      <>
        <circle cx="150" cy="115" r="82" fill="none" stroke={INK} strokeWidth="1.5" />
        {path("M68 115 A82 20 0 0 0 232 115")}{path("M68 115 A82 20 0 0 1 232 115", true)}
        <circle cx="150" cy="115" r="2.5" fill={INK} />
        {d.radius && <>{line(150, 115, 232, 115, true)}<T x={191} y={105}>{d.radius}</T></>}
        {d.diameter && <>{line(68, 115, 232, 115, true)}<T x={150} y={103}>{d.diameter}</T></>}
      </>
    );
  } else if (d.shape === "hemisphere") {
    body = (
      <>
        {path("M68 150 A82 82 0 0 1 232 150")}
        {path("M68 150 A82 20 0 0 1 232 150", true)}
        {path("M68 150 A82 20 0 0 0 232 150")}
        <circle cx="150" cy="150" r="2.5" fill={INK} />
        {d.radius && <>{line(150, 150, 232, 150, true)}<T x={191} y={140}>{d.radius}</T></>}
        {d.diameter && <T x={150} y={192}>{d.diameter}</T>}
      </>
    );
  } else if (d.shape === "cuboid") {
    body = (
      <>
        {path("M50 90 H190 V200 H50 Z")}
        {line(50, 90, 106, 42)}{line(190, 90, 246, 42)}{line(190, 200, 246, 152)}
        {line(106, 42, 246, 42)}{line(246, 42, 246, 152)}
        {line(50, 200, 106, 152, true)}{line(106, 152, 246, 152, true)}{line(106, 152, 106, 42, true)}
        {d.length && <T x={120} y={218}>{d.length}</T>}
        {d.height && <T x={40} y={145} anchor="end">{d.height}</T>}
        {d.width && <T x={226} y={188} anchor="start">{d.width}</T>}
      </>
    );
  } else if (d.shape === "pyramid") {
    body = (
      <>
        {line(60, 190, 200, 190)}{line(200, 190, 252, 150)}
        {line(156, 28, 60, 190)}{line(156, 28, 200, 190)}{line(156, 28, 252, 150)}
        {line(60, 190, 112, 150, true)}{line(112, 150, 252, 150, true)}{line(156, 28, 112, 150, true)}
        {d.height && <>{line(156, 28, 156, 170, true)}<T x={162} y={128} anchor="start">{d.height}</T></>}
        {d.base && <T x={130} y={208}>{d.base}</T>}
        {d.slantHeight && <T x={192} y={92} anchor="start">{d.slantHeight}</T>}
      </>
    );
  } else {
    body = (
      <>
        {path("M50 190 H170 V92 Z")}
        {line(120, 145, 240, 145, true)}
        {line(50, 190, 120, 145)}{line(170, 190, 240, 145)}{line(170, 92, 240, 47)}
        {line(240, 47, 240, 145)}{line(120, 145, 240, 47)}
        {d.base && <T x={110} y={208}>{d.base}</T>}
        {d.height && <T x={178} y={150} anchor="start">{d.height}</T>}
        {d.length && <T x={222} y={182} anchor="start">{d.length}</T>}
      </>
    );
  }
  return <svg viewBox="0 0 330 230" role="img" aria-label={label}>{body}</svg>;
}

// ── Bearings ────────────────────────────────────────────────────────────────
export function Bearing({ d }: { d: Extract<DiagramData, { type: "bearing" }> }) {
  const W = 320, H = 280, pad = 54;
  // True-direction layout in "map units", then fitted to the box.
  const pts: { label: string; x: number; y: number }[] = [{ label: d.origin, x: 0, y: 0 }];
  for (const leg of d.legs) {
    const prev = pts[pts.length - 1];
    const a = (leg.bearing * Math.PI) / 180, len = leg.length ?? 1;
    pts.push({ label: leg.to, x: prev.x + Math.sin(a) * len, y: prev.y + Math.cos(a) * len }); // y up = north
  }
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 0.01), spanY = Math.max(maxY - minY, 0.01);
  const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY, 120);
  const offX = (W - spanX * scale) / 2, offY = (H - spanY * scale) / 2;
  const sx = (x: number) => offX + (x - minX) * scale;
  const sy = (y: number) => H - offY - (y - minY) * scale;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bearing diagram">
      <defs>
        <marker id="bearingArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={INK} />
        </marker>
      </defs>
      {d.legs.map((leg, i) => {
        const a = pts[i], b = pts[i + 1];
        const x1 = sx(a.x), y1 = sy(a.y), x2 = sx(b.x), y2 = sy(b.y);
        const th = leg.bearing % 360;
        const r = 20;
        const arcEnd: [number, number] = [x1 + r * Math.sin((th * Math.PI) / 180), y1 - r * Math.cos((th * Math.PI) / 180)];
        const mid = ((th / 2) * Math.PI) / 180;
        const text = leg.bearingLabel === "" ? "" : (leg.bearingLabel ?? `${String(Math.round(leg.bearing)).padStart(3, "0")}°`);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
        return (
          <g key={i}>
            {line(x1, y1, x1, y1 - 40, false, 1.2)}
            <path d={`M${x1} ${y1 - 40} l-3 7 h6 z`} fill={INK} />
            <T x={x1} y={y1 - 50} italic>N</T>
            {line(x1, y1, x2, y2)}
            {th !== 0 && text && (
              <>
                <path d={`M${x1} ${y1 - r} A${r} ${r} 0 ${th > 180 ? 1 : 0} 1 ${arcEnd[0]} ${arcEnd[1]}`} fill="none" stroke={INK} strokeWidth="1.2" />
                <T x={x1 + 36 * Math.sin(mid)} y={y1 - 36 * Math.cos(mid) + (th < 90 ? -2 : 4)} size={12}>{text}</T>
              </>
            )}
            {leg.distance && <T x={mx + (dy / len) * 14} y={my - (dx / len) * 14} size={12}>{leg.distance}</T>}
          </g>
        );
      })}
      {pts.map((p, i) => {
        const prev = pts[i - 1];
        const toward = prev ? [sx(p.x) - sx(prev.x), sy(p.y) - sy(prev.y)] : [-1, 1];
        const len = Math.hypot(toward[0], toward[1]) || 1;
        return (
          <g key={i}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r="2.8" fill={INK} />
            <T x={sx(p.x) + (toward[0] / len) * 13} y={sy(p.y) + (toward[1] / len) * 13} italic size={14}>{p.label}</T>
          </g>
        );
      })}
    </svg>
  );
}

// ── Graphs of functions ─────────────────────────────────────────────────────
function niceStep(range: number): number {
  const raw = range / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag;
}
const sup = (s: string) => s.replace(/\^(\d)/g, (_, d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
const tick = (n: number) => String(Math.round(n * 1000) / 1000).replace("-", "−").replace(".", ",");

export function Graph({ d }: { d: Extract<DiagramData, { type: "graph" }> }) {
  const id = useId().replace(/:/g, "");
  const W = 360, H = 300, L = 30, R = 14, Tp = 14, B = 26;
  const px = (x: number) => L + ((x - d.xMin) / (d.xMax - d.xMin)) * (W - L - R);
  const py = (y: number) => H - B - ((y - d.yMin) / (d.yMax - d.yMin)) * (H - Tp - B);
  const xs = d.xStep ?? niceStep(d.xMax - d.xMin), ys = d.yStep ?? niceStep(d.yMax - d.yMin);
  const ticksX: number[] = [], ticksY: number[] = [];
  for (let v = Math.ceil(d.xMin / xs) * xs; v <= d.xMax + 1e-9; v += xs) ticksX.push(Math.round(v / xs) * xs);
  for (let v = Math.ceil(d.yMin / ys) * ys; v <= d.yMax + 1e-9; v += ys) ticksY.push(Math.round(v / ys) * ys);
  const ax = Math.min(Math.max(0, d.xMin), d.xMax), ay = Math.min(Math.max(0, d.yMin), d.yMax);
  const ySpan = d.yMax - d.yMin;

  const curves = (d.curves ?? []).map((c, ci) => {
    let f: ((x: number) => number) | null = null;
    try { f = compileExpr(c.expr); } catch { f = null; }
    if (!f) return null;
    const N = 360;
    const segs: string[] = [];
    let cur = "";
    let prevY: number | null = null;
    let last: [number, number] | null = null;
    for (let i = 0; i <= N; i++) {
      const x = d.xMin + ((d.xMax - d.xMin) * i) / N;
      const y = f(x);
      const ok = Number.isFinite(y) && Math.abs(y) < 1e6 && (prevY === null || Math.abs(y - prevY) < ySpan * 3);
      if (ok) {
        cur += `${cur ? "L" : "M"}${px(x).toFixed(1)} ${py(y).toFixed(1)}`;
        prevY = y;
        if (y >= d.yMin && y <= d.yMax) last = [x, y];
      } else { if (cur) segs.push(cur); cur = ""; prevY = Number.isFinite(y) && Math.abs(y) < 1e6 ? y : null; }
    }
    if (cur) segs.push(cur);
    return { ci, segs, last, c };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Graph">
      <defs><clipPath id={`${id}c`}><rect x={px(d.xMin)} y={py(d.yMax)} width={px(d.xMax) - px(d.xMin)} height={py(d.yMin) - py(d.yMax)} /></clipPath></defs>
      {ticksX.map((v) => <line key={`gx${v}`} x1={px(v)} x2={px(v)} y1={py(d.yMin)} y2={py(d.yMax)} stroke="#d8d8d8" strokeWidth="0.8" />)}
      {ticksY.map((v) => <line key={`gy${v}`} x1={px(d.xMin)} x2={px(d.xMax)} y1={py(v)} y2={py(v)} stroke="#d8d8d8" strokeWidth="0.8" />)}
      {line(px(d.xMin), py(ay), px(d.xMax), py(ay), false, 1.3)}
      {line(px(ax), py(d.yMin), px(ax), py(d.yMax), false, 1.3)}
      {ticksX.filter((v) => v !== 0).map((v) => <T key={`tx${v}`} x={px(v)} y={py(ay) + 11} size={10}>{tick(v)}</T>)}
      {ticksY.filter((v) => v !== 0).map((v) => <T key={`ty${v}`} x={px(ax) - 5} y={py(v)} size={10} anchor="end">{tick(v)}</T>)}
      <T x={px(ax) - 6} y={py(ay) + 10} size={10} anchor="end">0</T>
      <T x={px(d.xMax) - 4} y={py(ay) - 9} italic>x</T>
      <T x={px(ax) + 9} y={py(d.yMax) + 6} italic>y</T>
      <g clipPath={`url(#${id}c)`}>
        {curves.map((cv) => cv && cv.segs.map((s, si) => (
          <path key={`${cv.ci}-${si}`} d={s} fill="none" stroke={INK} strokeWidth="1.8" strokeDasharray={cv.c.dashed ? DASH : undefined} />
        )))}
      </g>
      {curves.map((cv) => cv && cv.c.label && cv.last && <T key={`l${cv.ci}`} x={px(cv.last[0]) - 4} y={py(cv.last[1]) - 10} size={12} anchor="end" italic>{sup(cv.c.label)}</T>)}
      {d.points?.map((p, i) => (
        <g key={`p${i}`}>
          <circle cx={px(p.x)} cy={py(p.y)} r="2.8" fill={INK} />
          {p.label && <T x={px(p.x) + 6} y={py(p.y) - 8} size={11} anchor="start">{p.label}</T>}
        </g>
      ))}
    </svg>
  );
}
