import { PP_A, PP_B, PP_H, PP_W } from "./ppPaths";

/** The double-P monogram. tone="light" is for light backgrounds, "dark" for navy. */
export function LogoMark({ className = "logo-mark", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <svg className={className} viewBox={`0 0 ${PP_W} ${PP_H}`} aria-hidden="true">
      <path fill={tone === "dark" ? "#ffffff" : "#0b3452"} d={PP_A} />
      <path fill="#c9a227" d={PP_B} />
    </svg>
  );
}
