// One-off: migrate dark-first utility classes to a light theme.
// Exact-string replacements; order matters (specific before generic).
// index.css, Button.tsx, Logo.tsx text-white are handled by hand.
import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("find src -name '*.tsx' -o -name '*.ts'", {
  cwd: process.cwd(),
})
  .toString()
  .trim()
  .split("\n")
  .filter((f) => !f.endsWith("index.css"));

// [from, to] applied as plain global string replaces, in order.
const rules = [
  ["bg-white/[0.08]", "bg-slate-900/[0.06]"],
  ["bg-white/[0.06]", "bg-slate-900/[0.04]"],
  ["bg-white/[0.05]", "bg-slate-900/[0.04]"],
  ["bg-white/[0.04]", "bg-white"],
  ["bg-white/[0.03]", "bg-slate-900/[0.03]"],
  ["bg-white/[0.02]", "bg-slate-50"],
  ["border-white/[0.06]", "border-slate-900/[0.08]"],
  ["border-white/[0.04]", "border-slate-900/[0.06]"],
  ["border-white/10", "border-slate-900/10"],
  ["ring-white/30", "ring-slate-900/20"],
  ["ring-white/20", "ring-slate-900/15"],
  ["bg-ink-950/70", "bg-slate-900/30"],
  ["bg-ink-900/60", "bg-white/70"],
  ["bg-ink-800", "bg-white"],
  ["bg-ink-600", "bg-slate-300"],
  ["text-slate-100", "text-slate-800"],
  ["text-slate-200", "text-slate-800"],
  ["text-slate-300", "text-slate-700"],
  ["text-slate-400", "text-slate-600"],
  ["text-brand-200", "text-brand-700"],
  ["text-brand-300", "text-brand-700"],
  ["text-brand-400", "text-brand-600"],
];

const skipWhite = new Set(["src/components/ui/Button.tsx", "src/components/brand/Logo.tsx"]);

let changed = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  const before = src;
  for (const [from, to] of rules) src = src.split(from).join(to);
  if (!skipWhite.has(file)) src = src.split("text-white").join("text-slate-900");
  if (src !== before) {
    writeFileSync(file, src);
    changed++;
  }
}
console.log(`Updated ${changed} files`);
void globSync;
