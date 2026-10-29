import type { ReactNode } from "react";

/**
 * Typesets PaperPal's plain-text maths notation:
 *   x^2  x^(n+1)  10^-3     powers
 *   x_1  503_6              subscripts
 *   frac(3,4)               fractions
 *   sqrt(5)                 square roots
 *   mat(3,a;4,2)            matrices (columns split by commas, rows by semicolons); mat(7;-3) is a column vector
 *   <=  >=  !=  *           become the proper signs
 * Anything else is left exactly as written.
 */

/** Index of the ")" that closes the "(" at `open`, or -1. */
function closing(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/** Splits on `sep`, ignoring separators inside brackets. */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === sep && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

function plainSymbols(s: string): string {
  return s
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/!=/g, "≠")
    .replace(/(?<=[\w)\s])\*(?=[\w(\s])/g, "×");
}

export function parseMath(input: string, keyPrefix = "m"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buf = "";
  let n = 0;
  const flush = () => {
    if (buf) nodes.push(plainSymbols(buf));
    buf = "";
  };
  const push = (node: ReactNode) => {
    flush();
    nodes.push(node);
  };
  const key = () => `${keyPrefix}${n++}`;

  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);
    const fn = /^(frac|sqrt|mat)\(/.exec(rest);
    if (fn) {
      const open = i + fn[0].length - 1;
      const end = closing(input, open);
      if (end > 0) {
        const inner = input.slice(open + 1, end);
        if (fn[1] === "frac") {
          const [num, ...den] = splitTop(inner, ",");
          push(
            <span key={key()} className="m-frac">
              <span className="m-num">{parseMath(num, key())}</span>
              <span className="m-den">{parseMath(den.join(","), key())}</span>
            </span>,
          );
        } else if (fn[1] === "sqrt") {
          push(
            <span key={key()} className="m-sqrt">
              <span className="m-radical">√</span>
              <span className="m-radicand">{parseMath(inner, key())}</span>
            </span>,
          );
        } else {
          const rows = splitTop(inner, ";").map((r) => splitTop(r, ","));
          const cols = Math.max(...rows.map((r) => r.length));
          push(
            <span key={key()} className="m-mat" role="img" aria-label="matrix" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
              {rows.flatMap((row, r) => row.map((cell, c) => <span key={`${r}-${c}`} className="m-cell">{parseMath(cell.trim(), key())}</span>))}
            </span>,
          );
        }
        i = end + 1;
        continue;
      }
    }
    const ch = input[i];
    if (ch === "^") {
      let body = "";
      let next = i + 1;
      if (input[next] === "(") {
        const end = closing(input, next);
        if (end > 0) {
          body = input.slice(next + 1, end);
          next = end + 1;
        }
      } else {
        const m = /^-?[A-Za-z0-9]+/.exec(input.slice(next));
        if (m) {
          body = m[0];
          next += m[0].length;
        }
      }
      if (body) {
        push(<sup key={key()}>{parseMath(body, key())}</sup>);
        i = next;
        continue;
      }
    }
    if (ch === "_" && i > 0 && /[\w)]/.test(input[i - 1])) {
      const m = /^[A-Za-z0-9]+/.exec(input.slice(i + 1));
      if (m) {
        push(<sub key={key()}>{m[0]}</sub>);
        i += 1 + m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return nodes;
}

export function MathText({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return <>{parseMath(children)}</>;
}
