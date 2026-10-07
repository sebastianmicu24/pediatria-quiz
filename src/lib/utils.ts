export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/** Mescolamento Fisher-Yates (non muta l'array originale). */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

/**
 * Sanitizzatore HTML minimale con allowlist.
 * Consente solo i tag usati nelle spiegazioni del dataset
 * (p, strong, em, b, i, ul, ol, li, br) e rimuove ogni attributo.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "br",
]);

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  let output = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  output = output.replace(/<[^>]*>/g, (tag) => {
    const match = tag.match(/^<\s*\/?\s*([a-zA-Z0-9]+)/);
    if (!match) return "";
    const name = match[1].toLowerCase();
    const closing = /^<\s*\//.test(tag);
    if (!ALLOWED_TAGS.has(name)) return "";
    return closing ? `</${name}>` : `<${name}>`;
  });
  return output;
}

/**
 * Garantisce che un parametro ?next= sia un percorso interno
 * (evita open redirect verso siti esterni).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

/** Interpreta il parametro ?count= dell'URL del quiz. */
export function parseQuestionCount(value: string | undefined, max: number): number {
  if (value === "all") return max;
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(parsed, 1), max);
}

export function parseDifficulty(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  if (![1, 2, 3].includes(parsed)) return null;
  return parsed;
}
