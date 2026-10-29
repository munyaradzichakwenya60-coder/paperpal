import { useId } from "react";
import type { Diagram as DiagramData } from "../types";
import { MathText } from "./MathText";
import { Solid, Bearing, Graph } from "./Diagram2";

const INK = "#111";
const FONT = "Georgia, 'Times New Roman', serif";

type TextProps = { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; size?: number; italic?: boolean };
function T({ x, y, children, anchor = "middle", size = 13, italic = false }: TextProps) {
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={size} fontFamily={FONT} fontStyle={italic ? "italic" : "normal"} fill={INK}>
      {children}
    </text>
  );
}

const show = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

// ── Venn ────────────────────────────────────────────────────────────────────
function Venn({ d }: { d: Extract<DiagramData, { type: "venn" }> }) {
  const three = d.sets.length >= 3;
  const c = d.counts ?? [];
  const circle = { fill: "none", stroke: INK, strokeWidth: 1.5 };
  if (!three) {
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={`Venn diagram of sets ${d.sets.join(" and ")}`}>
        <rect x="2" y="2" width="316" height="196" fill="none" stroke={INK} strokeWidth="1.5" />
        <T x={16} y={16} italic>ξ</T>
        <circle cx="120" cy="105" r="62" {...circle} />
        <circle cx="200" cy="105" r="62" {...circle} />
        <T x={88} y={28} italic>{d.sets[0]}</T>
        <T x={232} y={28} italic>{d.sets[1]}</T>
        <T x={90} y={105}>{show(c[0])}</T>
        <T x={160} y={105}>{show(c[1])}</T>
        <T x={230} y={105}>{show(c[2])}</T>
        <T x={292} y={184}>{show(c[3])}</T>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 250" role="img" aria-label={`Venn diagram of sets ${d.sets.join(", ")}`}>
      <rect x="2" y="2" width="316" height="246" fill="none" stroke={INK} strokeWidth="1.5" />
      <T x={16} y={16} italic>ξ</T>
      <circle cx="128" cy="98" r="58" {...circle} />
      <circle cx="192" cy="98" r="58" {...circle} />
      <circle cx="160" cy="152" r="58" {...circle} />
      <T x={78} y={34} italic>{d.sets[0]}</T>
      <T x={242} y={34} italic>{d.sets[1]}</T>
      <T x={160} y={238} italic>{d.sets[2]}</T>
      <T x={100} y={80}>{show(c[0])}</T>
      <T x={220} y={80}>{show(c[1])}</T>
      <T x={160} y={190}>{show(c[2])}</T>
      <T x={160} y={72}>{show(c[3])}</T>
      <T x={128} y={134}>{show(c[4])}</T>
      <T x={192} y={134}>{show(c[5])}</T>
      <T x={160} y={112}>{show(c[6])}</T>
      <T x={296} y={234}>{show(c[7])}</T>
    </svg>
  );
}

// ── Triangle ────────────────────────────────────────────────────────────────
function Triangle({ d }: { d: Extract<DiagramData, { type: "triangle" }> }) {
  const P: [number, number][] = [[50, 175], [265, 175], [195, 35]];
  const cen: [number, number] = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
  const sidePairs: [number, number][] = [[0, 1], [1, 2], [2, 0]];
  const sideLabel = [
    { dx: 0, dy: 16, anchor: "middle" as const },
    { dx: 12, dy: 0, anchor: "start" as const },
    { dx: -12, dy: 0, anchor: "end" as const },
  ];
  const outward = (i: number): [number, number] => {
    const dx = P[i][0] - cen[0], dy = P[i][1] - cen[1], len = Math.hypot(dx, dy);
    return [P[i][0] + (dx / len) * 16, P[i][1] + (dy / len) * 16];
  };
  const ra = d.rightAngleAt;
  let right: React.ReactNode = null;
  if (ra !== null && ra !== undefined && ra >= 0 && ra <= 2) {
    const v = P[ra], a = P[(ra + 1) % 3], b = P[(ra + 2) % 3], s = 13;
    const ua: [number, number] = [(a[0] - v[0]) / Math.hypot(a[0] - v[0], a[1] - v[1]), (a[1] - v[1]) / Math.hypot(a[0] - v[0], a[1] - v[1])];
    const ub: [number, number] = [(b[0] - v[0]) / Math.hypot(b[0] - v[0], b[1] - v[1]), (b[1] - v[1]) / Math.hypot(b[0] - v[0], b[1] - v[1])];
    const p1: [number, number] = [v[0] + ua[0] * s, v[1] + ua[1] * s];
    const p3: [number, number] = [v[0] + ub[0] * s, v[1] + ub[1] * s];
    const p2: [number, number] = [p1[0] + ub[0] * s, p1[1] + ub[1] * s];
    right = <polyline points={`${p1} ${p2} ${p3}`} fill="none" stroke={INK} strokeWidth="1.2" />;
  }
  return (
    <svg viewBox="0 0 320 215" role="img" aria-label={`Triangle ${d.vertices.join("")}`}>
      <polygon points={P.map((p) => p.join(",")).join(" ")} fill="none" stroke={INK} strokeWidth="1.6" />
      {right}
      {d.vertices.map((v, i) => {
        const [x, y] = outward(i);
        return <T key={i} x={x} y={y} italic>{v}</T>;
      })}
      {sidePairs.map(([a, b], i) => {
        const text = d.sides?.[i];
        if (!text) return null;
        const mx = (P[a][0] + P[b][0]) / 2 + sideLabel[i].dx;
        const my = (P[a][1] + P[b][1]) / 2 + sideLabel[i].dy;
        return <T key={i} x={mx} y={my} anchor={sideLabel[i].anchor}>{text}</T>;
      })}
      {d.angles?.map((text, i) => {
        if (!text) return null;
        const x = P[i][0] + (cen[0] - P[i][0]) * 0.3;
        const y = P[i][1] + (cen[1] - P[i][1]) * 0.3;
        return <T key={i} x={x} y={y} size={12}>{text}</T>;
      })}
      <T x={160} y={207} size={10} italic>Diagram not drawn to scale</T>
    </svg>
  );
}

// ── Number line ─────────────────────────────────────────────────────────────
function NumberLine({ d }: { d: Extract<DiagramData, { type: "numberline" }> }) {
  const W = 380, L = 24, R = W - 24, y = 46;
  const x = (v: number) => L + ((v - d.min) / (d.max - d.min)) * (R - L);
  const ticks: number[] = [];
  const step = d.step > 0 ? d.step : 1;
  for (let v = d.min; v <= d.max + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const dot = (v: number, open: boolean, key: string) => (
    <circle key={key} cx={x(v)} cy={y} r="5" fill={open ? "#fff" : INK} stroke={INK} strokeWidth="1.5" />
  );
  const sh = d.shade;
  return (
    <svg viewBox={`0 0 ${W} 90`} role="img" aria-label="Number line">
      <defs>
        <marker id="nl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={INK} />
        </marker>
      </defs>
      {sh && (
        <line
          x1={sh.from === null ? L : x(sh.from)} x2={sh.to === null ? R : x(sh.to)} y1={y} y2={y}
          stroke={INK} strokeWidth="3.5"
        />
      )}
      <line x1={L - 10} x2={R + 10} y1={y} y2={y} stroke={INK} strokeWidth="1.4" markerStart="url(#nl-arrow)" markerEnd="url(#nl-arrow)" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={y - 5} y2={y + 5} stroke={INK} strokeWidth="1.2" />
          <T x={x(v)} y={y + 20} size={11}>{String(v)}</T>
        </g>
      ))}
      {sh && sh.from !== null && dot(sh.from, sh.fromOpen, "sf")}
      {sh && sh.to !== null && dot(sh.to, sh.toOpen, "st")}
      {d.points?.map((p, i) => (
        <g key={i}>
          {dot(p.value, p.style === "open", `p${i}`)}
          {p.label && <T x={x(p.value)} y={y - 16} size={12} italic>{p.label}</T>}
        </g>
      ))}
    </svg>
  );
}

// ── Coordinate grid ─────────────────────────────────────────────────────────
function Grid({ d }: { d: Extract<DiagramData, { type: "grid" }> }) {
  const cols = d.xMax - d.xMin, rows = d.yMax - d.yMin;
  const cell = Math.max(10, Math.min(22, Math.floor(330 / Math.max(cols, rows))));
  const pad = 26;
  const W = cols * cell + pad * 2, H = rows * cell + pad * 2;
  const px = (v: number) => pad + (v - d.xMin) * cell;
  const py = (v: number) => pad + (d.yMax - v) * cell;
  const every = Math.max(cols, rows) > 14 ? 2 : 1;
  const ax = Math.min(Math.max(0, d.xMin), d.xMax), ay = Math.min(Math.max(0, d.yMin), d.yMax);
  const xs: number[] = [], ys: number[] = [];
  for (let v = d.xMin; v <= d.xMax; v++) xs.push(v);
  for (let v = d.yMin; v <= d.yMax; v++) ys.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Coordinate grid" style={{ maxWidth: W * 1.1 }}>
      {xs.map((v) => <line key={`gx${v}`} x1={px(v)} x2={px(v)} y1={py(d.yMax)} y2={py(d.yMin)} stroke="#bbb" strokeWidth="0.6" />)}
      {ys.map((v) => <line key={`gy${v}`} x1={px(d.xMin)} x2={px(d.xMax)} y1={py(v)} y2={py(v)} stroke="#bbb" strokeWidth="0.6" />)}
      <line x1={px(d.xMin) - 6} x2={px(d.xMax) + 8} y1={py(ay)} y2={py(ay)} stroke={INK} strokeWidth="1.4" />
      <line x1={px(ax)} x2={px(ax)} y1={py(d.yMin) + 6} y2={py(d.yMax) - 8} stroke={INK} strokeWidth="1.4" />
      <T x={px(d.xMax) + 14} y={py(ay)} italic>x</T>
      <T x={px(ax)} y={py(d.yMax) - 16} italic>y</T>
      {xs.filter((v) => v !== 0 && v % every === 0).map((v) => <T key={`lx${v}`} x={px(v)} y={py(ay) + 11} size={9}>{v}</T>)}
      {ys.filter((v) => v !== 0 && v % every === 0).map((v) => <T key={`ly${v}`} x={px(ax) - 9} y={py(v)} size={9} anchor="end">{v}</T>)}
      {d.polygons?.map((poly, i) => {
        const pts = poly.points.map(([x, y]) => `${px(x)},${py(y)}`).join(" ");
        const mx = poly.points.reduce((s, p) => s + p[0], 0) / poly.points.length;
        const my = poly.points.reduce((s, p) => s + p[1], 0) / poly.points.length;
        return (
          <g key={i}>
            {poly.points.length >= 3
              ? <polygon points={pts} fill="rgba(0,0,0,0.06)" stroke={INK} strokeWidth="1.6" />
              : <polyline points={pts} fill="none" stroke={INK} strokeWidth="1.6" />}
            {poly.name && <T x={px(mx)} y={py(my)} italic>{poly.name}</T>}
          </g>
        );
      })}
      {d.points?.map((p, i) => (
        <g key={i}>
          <circle cx={px(p.x)} cy={py(p.y)} r="3" fill={INK} />
          {p.label && <T x={px(p.x) + 9} y={py(p.y) - 8} italic>{p.label}</T>}
        </g>
      ))}
    </svg>
  );
}

// ── Bar chart ───────────────────────────────────────────────────────────────
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}
function Bar({ d }: { d: Extract<DiagramData, { type: "bar" }> }) {
  const W = 360, H = 230, left = 46, right = 14, top = d.title ? 30 : 14, bottom = 52;
  const max = niceMax(Math.max(...d.bars.map((b) => b.value)));
  const plotW = W - left - right, plotH = H - top - bottom;
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const slot = plotW / d.bars.length;
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => (max / 5) * i);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={d.title ?? "Bar chart"}>
      {d.title && <T x={W / 2} y={12} size={13}>{d.title}</T>}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke="#ccc" strokeWidth="0.6" />
          <T x={left - 6} y={y(v)} anchor="end" size={10}>{Math.round(v * 100) / 100}</T>
        </g>
      ))}
      <line x1={left} x2={left} y1={top} y2={top + plotH} stroke={INK} strokeWidth="1.3" />
      <line x1={left} x2={W - right} y1={top + plotH} y2={top + plotH} stroke={INK} strokeWidth="1.3" />
      {d.bars.map((b, i) => (
        <g key={i}>
          <rect x={left + i * slot + slot * 0.18} y={y(b.value)} width={slot * 0.64} height={top + plotH - y(b.value)} fill="#d9d9d9" stroke={INK} strokeWidth="1.2" />
          <T x={left + i * slot + slot / 2} y={top + plotH + 12} size={10}>{b.label}</T>
        </g>
      ))}
      {d.xLabel && <T x={left + plotW / 2} y={H - 10} size={11}>{d.xLabel}</T>}
      {d.yLabel && (
        <g transform={`translate(11 ${top + plotH / 2}) rotate(-90)`}><T x={0} y={0} size={11}>{d.yLabel}</T></g>
      )}
    </svg>
  );
}

// ── Circle ──────────────────────────────────────────────────────────────────
function Circle({ d }: { d: Extract<DiagramData, { type: "circle" }> }) {
  const cx = 140, cy = 130, r = 96;
  const n = d.points.length;
  const pos = new Map<string, [number, number, number]>();
  d.points.forEach((name, i) => {
    const a = ((-100 + (i * 360) / n + (i % 2 ? 7 : -5)) * Math.PI) / 180;
    pos.set(name, [cx + r * Math.cos(a), cy + r * Math.sin(a), a]);
  });
  const centre = d.centre ?? "O";
  return (
    <svg viewBox="0 0 280 270" role="img" aria-label="Circle diagram">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="1.6" />
      {d.chords?.map(([a, b], i) => {
        const p = pos.get(a), q = pos.get(b);
        return p && q ? <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={INK} strokeWidth="1.4" /> : null;
      })}
      {d.radii?.map((a, i) => {
        const p = pos.get(a);
        return p ? <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke={INK} strokeWidth="1.4" /> : null;
      })}
      <circle cx={cx} cy={cy} r="2.5" fill={INK} />
      <T x={cx + 10} y={cy + 12} italic>{centre}</T>
      {d.points.map((name) => {
        const p = pos.get(name)!;
        return (
          <g key={name}>
            <circle cx={p[0]} cy={p[1]} r="2.5" fill={INK} />
            <T x={cx + (r + 15) * Math.cos(p[2])} y={cy + (r + 15) * Math.sin(p[2])} italic>{name}</T>
          </g>
        );
      })}
      {d.marks?.map((m, i) => {
        const p = pos.get(m.at);
        if (!p) return null;
        return <T key={i} x={cx + (r - 30) * Math.cos(p[2])} y={cy + (r - 30) * Math.sin(p[2])} size={12}>{m.text}</T>;
      })}
      <T x={140} y={262} size={10} italic>Diagram not drawn to scale</T>
    </svg>
  );
}


// ── Table ───────────────────────────────────────────────────────────────────
function Table({ d }: { d: Extract<DiagramData, { type: "table" }> }) {
  const labelled = !!d.rowLabels;
  return (
    <table className={labelled ? "diagram-table row-labels" : "diagram-table"}>
      <thead>
        <tr>{d.headers.map((h, i) => <th key={i}><MathText>{h}</MathText></th>)}</tr>
      </thead>
      <tbody>
        {d.rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => <td key={c}><MathText>{cell}</MathText></td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Pipe / ring cross-section ───────────────────────────────────────────────
const num = (s: string) => parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));

function Annulus({ d }: { d: Extract<DiagramData, { type: "annulus" }> }) {
  const id = useId().replace(/:/g, "");
  const cx = 150, cy = 105, R = 92;
  const ratio = num(d.inner) / num(d.outer);
  // Drawn with a visibly thick ring whatever the real sizes (the diagram is not to scale).
  const r = R * (Number.isFinite(ratio) && ratio > 0.2 ? Math.min(ratio, 0.78) : 0.78);
  return (
    <svg viewBox="0 0 300 235" role="img" aria-label="Cross-section of a hollow pipe">
      <defs>
        <marker id={`${id}a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={INK} />
        </marker>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="#c9c9c9" stroke={INK} strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="1.4" />
      <line x1={cx - r + 2} x2={cx + r - 2} y1={cy} y2={cy} stroke={INK} strokeWidth="1" markerStart={`url(#${id}a)`} markerEnd={`url(#${id}a)`} />
      <rect x={cx - 28} y={cy - 10} width="56" height="20" fill="#fff" />
      <T x={cx} y={cy} size={13}>{d.inner}</T>
      <line x1={cx - R} x2={cx + R} y1={cy + R + 18} y2={cy + R + 18} stroke={INK} strokeWidth="1" markerStart={`url(#${id}a)`} markerEnd={`url(#${id}a)`} />
      <T x={cx} y={cy + R + 31} size={13}>{d.outer}</T>
    </svg>
  );
}

// ── Region defined by inequalities ──────────────────────────────────────────
function Inequality({ d }: { d: Extract<DiagramData, { type: "inequality" }> }) {
  const id = useId().replace(/:/g, "");
  const W = 320, H = 300, pad = 22;
  const scale = Math.min((W - pad * 2) / (d.xMax - d.xMin), (H - pad * 2) / (d.yMax - d.yMin));
  const px = (x: number) => pad + (x - d.xMin) * scale;
  const py = (y: number) => H - pad - (y - d.yMin) * scale;
  const ax = Math.min(Math.max(0, d.xMin), d.xMax), ay = Math.min(Math.max(0, d.yMin), d.yMax);

  const far = 1000;
  const lines = d.lines.map((l, i) => {
    const [x1, y1] = l.from, [x2, y2] = l.to;
    let dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    let nx = -dy, ny = dx;
    if (nx * (d.inside[0] - x1) + ny * (d.inside[1] - y1) > 0) { nx = -nx; ny = -ny; }
    const a: [number, number] = [x1 - dx * far, y1 - dy * far];
    const b: [number, number] = [x1 + dx * far, y1 + dy * far];
    const hatch = [a, b, [b[0] + nx * far, b[1] + ny * far], [a[0] + nx * far, a[1] + ny * far]]
      .map(([x, y]) => `${px(x)},${py(y)}`).join(" ");
    return { i, a, b, hatch, dashed: !!l.dashed };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Region defined by inequalities">
      <defs>
        <pattern id={`${id}p`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="9" stroke={INK} strokeWidth="1" />
        </pattern>
        <clipPath id={`${id}c`}><rect x={px(d.xMin)} y={py(d.yMax)} width={px(d.xMax) - px(d.xMin)} height={py(d.yMin) - py(d.yMax)} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        {lines.map((l) => <polygon key={`h${l.i}`} points={l.hatch} fill={`url(#${id}p)`} stroke="none" />)}
        {lines.map((l) => (
          <line key={`l${l.i}`} x1={px(l.a[0])} y1={py(l.a[1])} x2={px(l.b[0])} y2={py(l.b[1])}
            stroke={INK} strokeWidth="1.5" strokeDasharray={l.dashed ? "6 5" : undefined} />
        ))}
      </g>
      <line x1={px(d.xMin)} x2={px(d.xMax)} y1={py(ay)} y2={py(ay)} stroke={INK} strokeWidth="1.2" />
      <line x1={px(ax)} x2={px(ax)} y1={py(d.yMin)} y2={py(d.yMax)} stroke={INK} strokeWidth="1.2" />
      <T x={px(d.xMax) - 4} y={py(ay) + 12} italic>x</T>
      <T x={px(ax) + 10} y={py(d.yMax) + 6} italic>y</T>
      <T x={px(ax) - 8} y={py(ay) + 10} size={11}>0</T>
      {d.regionLabel && <T x={px(d.inside[0])} y={py(d.inside[1])} size={15}>{d.regionLabel}</T>}
      {d.points?.map((p, i) => (
        <g key={i}>
          <circle cx={px(p.x)} cy={py(p.y)} r="2.5" fill={INK} />
          <rect x={px(p.x) + 4} y={py(p.y) - 17} width={p.label.length * 6.4 + 6} height="15" fill="#fff" />
          <T x={px(p.x) + 7} y={py(p.y) - 9} anchor="start" size={11}>{p.label}</T>
        </g>
      ))}
    </svg>
  );
}

export function Diagram({ diagram }: { diagram: DiagramData }) {
  let body: React.ReactNode = null;
  switch (diagram.type) {
    case "venn": body = <Venn d={diagram} />; break;
    case "triangle": body = <Triangle d={diagram} />; break;
    case "numberline": body = <NumberLine d={diagram} />; break;
    case "grid": body = <Grid d={diagram} />; break;
    case "bar": body = <Bar d={diagram} />; break;
    case "circle": body = <Circle d={diagram} />; break;
    case "table": body = <Table d={diagram} />; break;
    case "annulus": body = <Annulus d={diagram} />; break;
    case "inequality": body = <Inequality d={diagram} />; break;
    case "solid": body = <Solid d={diagram} />; break;
    case "bearing": body = <Bearing d={diagram} />; break;
    case "graph": body = <Graph d={diagram} />; break;
  }
  return <figure className={`diagram diagram-${diagram.type}`}>{body}</figure>;
}
