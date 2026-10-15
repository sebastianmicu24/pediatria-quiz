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
 * Consente la formattazione usata nelle domande/spiegazioni (grassetto,
 * corsivo, sottolineato, barrato, elenchi), gli stili inline sicuri su
 * <span> (colore, sfondo, dimensione e font) e le immagini caricate nel
 * bucket Supabase "quiz-images" (solo endpoint pubblico: niente SVG,
 * data URL o script). Ogni altro tag/attributo viene rimosso.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "span",
  "ul",
  "ol",
  "li",
  "br",
  "img",
]);

const VOID_TAGS = new Set(["br", "img"]);

/** Proprietà CSS consentite nello stile inline dei <span>. */
const TEXT_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "font-family",
]);

/** Proprietà CSS consentite sui blocchi (paragrafi, ecc.). */
const BLOCK_STYLE_PROPS = new Set(["text-align"]);

function isSafeTextAlignValue(value: string): boolean {
  return /^(left|center|right|justify)$/i.test(value);
}

function isSafeColorValue(value: string): boolean {
  return (
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^[a-z]+$/i.test(value) ||
    /^(rgb|rgba|hsl|hsla)\(\s*[\d.,%\s]+\)$/i.test(value)
  );
}

function isSafeFontSizeValue(value: string): boolean {
  if (/^(xx-small|x-small|small|medium|large|x-large|xx-large)$/i.test(value)) {
    return true;
  }
  const match = value.match(/^(\d{1,3})(\.\d+)?(px|pt|%|em|rem)$/i);
  return match ? Number(match[1]) <= 400 : false;
}

function isSafeFontFamilyValue(value: string): boolean {
  return /^[a-z0-9][a-z0-9 ,-]{0,80}$/i.test(value);
}

function sanitizeStyleAttribute(
  style: string,
  kind: "text" | "block"
): string {
  const kept: string[] = [];
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (value === "") continue;

    let safe = false;
    if (kind === "block") {
      safe = BLOCK_STYLE_PROPS.has(property) && isSafeTextAlignValue(value);
    } else if (TEXT_STYLE_PROPS.has(property)) {
      safe =
        property === "font-size"
          ? isSafeFontSizeValue(value)
          : property === "font-family"
            ? isSafeFontFamilyValue(value)
            : isSafeColorValue(value);
    }
    if (!safe) continue;

    kept.push(`${property}: ${value}`);
  }
  return kept.join("; ");
}

function escapeAttributeValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/[<>]/g, "");
}

/** Ammette solo immagini dal bucket pubblico "quiz-images" del progetto. */
function sanitizeImageSrc(value: string): string | null {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  if (!base) return null;

  const prefix = `${base}/storage/v1/object/public/quiz-images/`;
  const src = value.trim();
  if (!src.startsWith(prefix)) return null;

  const rest = src.slice(prefix.length);
  if (rest.length === 0 || !/^[a-zA-Z0-9/._-]+$/.test(rest)) return null;
  return src;
}

function sanitizeTagAttributes(tagName: string, attributes: string): string {
  const kept: string[] = [];
  // Solo valori tra virgolette: gli attributi senza valore o malformati
  // vengono ignorati.
  const attributeRegex = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attributeRegex.exec(attributes)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? "";

    if ((tagName === "span" || tagName === "p") && name === "style") {
      const style = sanitizeStyleAttribute(
        value,
        tagName === "span" ? "text" : "block"
      );
      if (style) kept.push(`style="${style}"`);
    } else if (tagName === "img") {
      if (name === "src") {
        const src = sanitizeImageSrc(value);
        if (src) kept.push(`src="${src}"`);
      } else if (name === "alt") {
        const alt = escapeAttributeValue(value.trim().slice(0, 200));
        if (alt) kept.push(`alt="${alt}"`);
      } else if (name === "width" || name === "height") {
        if (/^\d{1,4}$/.test(value)) kept.push(`${name}="${value}"`);
      }
    }
  }
  return kept.join(" ");
}

function sanitizeTag(tag: string): string {
  const match = tag.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)([\s\S]*?)>$/);
  if (!match) return "";
  const closing = match[1] === "/";
  const name = match[2].toLowerCase();
  if (!ALLOWED_TAGS.has(name)) return "";
  if (closing) return VOID_TAGS.has(name) ? "" : `</${name}>`;

  const attributes = sanitizeTagAttributes(name, match[3] ?? "");
  if (name === "br") return "<br>";
  if (name === "img") {
    return attributes.includes("src=") ? `<img ${attributes}>` : "";
  }
  return attributes ? `<${name} ${attributes}>` : `<${name}>`;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  // Blocchi attivi rimossi integralmente (contenuto compreso).
  const withoutBlocks = html.replace(
    /<(script|style|iframe|object|embed|template|svg)[^>]*>[\s\S]*?<\/\1>/gi,
    ""
  );
  return withoutBlocks
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith("<") && part.endsWith(">")) {
        return sanitizeTag(part);
      }
      // Testo semplice: gli eventuali "<" spaiati (tag non chiusi) non
      // devono diventare tag nel documento renderizzato.
      return part.replace(/</g, "&lt;");
    })
    .join("");
}

/**
 * Garantisce che un parametro ?next= sia un percorso interno
 * (evita open redirect verso siti esterni, inclusi i trucchi
 * con backslash tipo "/\evil.com").
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}

/** Rimuove i tag HTML, per anteprime in testo semplice. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Interpreta i parametri ?difficulty= dell'URL (anche ripetuti). */
export function parseDifficulties(
  value: string | string[] | undefined
): number[] {
  const list = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const parsed = list
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => [1, 2, 3].includes(item));
  return [...new Set(parsed)];
}

/** Giorni di calendario trascorsi da una data ISO (0 = oggi, 1 = ieri…). */
export function daysSince(iso: string, now: number): number {
  const day = (value: number) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.max(0, Math.round((day(now) - day(Date.parse(iso))) / 86_400_000));
}

/** "oggi", "ieri", "3 giorni fa": per riepiloghi di attività. */
export function relativeDay(iso: string, now: number): string {
  const days = daysSince(iso, now);
  if (days === 0) return "oggi";
  if (days === 1) return "ieri";
  return `${days} giorni fa`;
}
