// A tiny, safe formula reader for graph questions. Identical copy of server/src/mathexpr.ts: keep the two in step.

export type Compiled = (x: number) => number;

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "").replace(/,/g, ".");
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+|^[0-9]+\.?/.exec(s.slice(i));
      if (!m) throw new Error("bad number");
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
    } else if (/[a-z]/i.test(c)) {
      const m = /^[a-z]+/i.exec(s.slice(i))!;
      const word = m[0].toLowerCase();
      // "2xy" style runs are not supported; only x, pi and the named functions.
      if (word === "x" || word === "pi" || ["sin", "cos", "tan", "sqrt", "abs"].includes(word)) out.push({ t: "id", v: word });
      else if (/^x+$/.test(word)) for (const _ of word) out.push({ t: "id", v: "x" });
      else throw new Error(`unknown word ${word}`);
      i += m[0].length;
    } else if ("+-*/^()".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else throw new Error(`unexpected ${c}`);
  }
  return out;
}

export function compileExpr(src: string): Compiled {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && (peek() as { v: string }).v === v;

  type Node = (x: number) => number;
  const rad = (d: number) => (d * Math.PI) / 180;

  function expr(): Node {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = (toks[p++] as { v: string }).v;
      const l = left, r = term();
      left = op === "+" ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return left;
  }
  function startsAtom(): boolean {
    const t = peek();
    return !!t && (t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "("));
  }
  function term(): Node {
    let left = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = (toks[p++] as { v: string }).v;
        const l = left, r = unary();
        left = op === "*" ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      } else if (startsAtom()) {
        // implicit multiplication: 2x, 3(x+1), x(x-2)
        const l = left, r = power();
        left = (x) => l(x) * r(x);
      } else return left;
    }
  }
  function unary(): Node {
    if (isOp("-")) { p++; const n = unary(); return (x) => -n(x); }
    if (isOp("+")) { p++; return unary(); }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (isOp("^")) { p++; const e = unary(); return (x) => Math.pow(base(x), e(x)); }
    return base;
  }
  function atom(): Node {
    const t = toks[p++];
    if (!t) throw new Error("unexpected end");
    if (t.t === "num") { const v = t.v; return () => v; }
    if (t.t === "op" && t.v === "(") {
      const n = expr();
      if (!isOp(")")) throw new Error("missing )");
      p++;
      return n;
    }
    if (t.t === "id") {
      if (t.v === "x") return (x) => x;
      if (t.v === "pi") return () => Math.PI;
      if (!isOp("(")) throw new Error("function needs brackets");
      p++;
      const arg = expr();
      if (!isOp(")")) throw new Error("missing )");
      p++;
      const f = { sin: (v: number) => Math.sin(rad(v)), cos: (v: number) => Math.cos(rad(v)), tan: (v: number) => Math.tan(rad(v)), sqrt: Math.sqrt, abs: Math.abs }[t.v]!;
      return (x) => f(arg(x));
    }
    throw new Error(`unexpected ${(t as { v: string }).v}`);
  }

  const root = expr();
  if (p !== toks.length) throw new Error("unexpected text after formula");
  return root;
}
