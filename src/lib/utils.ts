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
 *
 * Due profili:
 *  - "quiz" (predefinito): formattazione di domande e spiegazioni
 *    (grassetto, corsivo, sottolineato, barrato, elenchi), stili inline
 *    sicuri su <span> (colore, sfondo, dimensione, font), immagini del
 *    bucket Supabase "quiz-images" e i soli pulsanti verso gli articoli
 *    del blog (<a data-blog-button href="/blog/<slug>">). Nessun altro link.
 *  - "blog": in più titoli, citazioni, linea orizzontale, apici/pedici,
 *    tabelle e link (http/https, mailto, tel o percorsi interni).
 *
 * Niente SVG, data URL o script: ogni altro tag/attributo viene rimosso.
 * Il markup in uscita è ricostruito da valori validati, mai copiato.
 */
export type SanitizeProfile = "quiz" | "blog";

const QUIZ_TAGS = new Set([
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
  "a",
]);

const BLOG_TAGS = new Set([
  ...QUIZ_TAGS,
  "h2",
  "h3",
  "h4",
  "blockquote",
  "hr",
  "sub",
  "sup",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

const VOID_TAGS = new Set(["br", "img", "hr"]);

/** Tag di blocco su cui è ammesso l'allineamento del testo. */
const ALIGNABLE_TAGS = new Set(["p", "h2", "h3", "h4"]);

/** Proprietà CSS consentite nello stile inline dei <span>. */
const TEXT_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "font-family",
]);

/** Proprietà CSS consentite sui blocchi (paragrafi, titoli). */
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

/** Percorso di un articolo del blog: "/blog/<slug>" e nient'altro. */
const BLOG_PATH_REGEX = /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sanitizeBlogPath(value: string): string | null {
  const path = value.trim();
  return path.length <= 120 && BLOG_PATH_REGEX.test(path) ? path : null;
}

type SafeLink = { href: string; kind: "internal" | "external" | "other" };

/**
 * Valida la destinazione di un link del blog. Ammessi: percorsi interni,
 * http/https (senza credenziali nell'URL), mailto e tel. Qualsiasi altro
 * schema (javascript:, data:, vbscript:…) viene rifiutato.
 */
function sanitizeLinkHref(raw: string): SafeLink | null {
  // L'unica entità decodificata è &amp;: l'attributo viene poi riscritto
  // con l'escape, quindi il browser ritrova esattamente il valore validato.
  const value = raw.trim().replace(/&amp;/gi, "&");
  if (value.length === 0 || value.length > 2000) return null;
  if (/[\s\u0000-\u001f\u007f\\<>"']/.test(value)) return null;

  if (value.startsWith("/")) {
    if (value.startsWith("//")) return null;
    return /^\/[A-Za-z0-9\-._~!$&()*+,;=:@%/?#]*$/.test(value)
      ? { href: value, kind: "internal" }
      : null;
  }
  if (value.startsWith("#")) {
    return /^#[A-Za-z0-9\-._~%]+$/.test(value)
      ? { href: value, kind: "internal" }
      : null;
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      if (!url.hostname || url.username || url.password) return null;
      return { href: url.href, kind: "external" };
    } catch {
      return null;
    }
  }
  if (/^mailto:[^\s?]+(\?[^\s]*)?$/i.test(value)) {
    return { href: value, kind: "other" };
  }
  if (/^tel:\+?[0-9().-]{3,30}$/i.test(value)) {
    return { href: value, kind: "other" };
  }
  return null;
}

/** Legge gli attributi tra virgolette; se ripetuti vale il primo. */
function parseAttributes(attributes: string): Map<string, string> {
  const found = new Map<string, string>();
  // Solo valori tra virgolette: gli attributi senza valore o malformati
  // vengono ignorati.
  const attributeRegex = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attributeRegex.exec(attributes)) !== null) {
    const name = match[1].toLowerCase();
    if (!found.has(name)) found.set(name, match[2] ?? match[3] ?? "");
  }
  return found;
}

function sanitizeTagAttributes(
  tagName: string,
  attributes: string,
  profile: SanitizeProfile
): string {
  const attrs = parseAttributes(attributes);
  const kept: string[] = [];

  if (tagName === "span") {
    const style = sanitizeStyleAttribute(attrs.get("style") ?? "", "text");
    if (style) kept.push(`style="${style}"`);
  } else if (ALIGNABLE_TAGS.has(tagName)) {
    const style = sanitizeStyleAttribute(attrs.get("style") ?? "", "block");
    if (style) kept.push(`style="${style}"`);
  } else if (tagName === "img") {
    const src = sanitizeImageSrc(attrs.get("src") ?? "");
    if (src) kept.push(`src="${src}"`);
    const alt = escapeAttributeValue((attrs.get("alt") ?? "").trim().slice(0, 200));
    if (alt) kept.push(`alt="${alt}"`);
    for (const name of ["width", "height"]) {
      const value = attrs.get(name);
      if (value !== undefined && /^\d{1,4}$/.test(value)) {
        kept.push(`${name}="${value}"`);
      }
    }
  } else if (tagName === "a") {
    if (profile === "quiz") {
      // Solo il pulsante verso un articolo del blog, aperto in una nuova
      // scheda per non interrompere l'esercitazione in corso.
      const path = sanitizeBlogPath(attrs.get("href") ?? "");
      if (path && attrs.get("data-blog-button") === "true") {
        kept.push(
          `href="${path}"`,
          `data-blog-button="true"`,
          `target="_blank"`,
          `rel="noopener"`
        );
      }
    } else {
      const link = sanitizeLinkHref(attrs.get("href") ?? "");
      if (link) {
        kept.push(`href="${escapeAttributeValue(link.href)}"`);
        if (link.kind === "external") {
          kept.push(`target="_blank"`, `rel="noopener noreferrer nofollow"`);
        }
      }
    }
  } else if (tagName === "th" || tagName === "td") {
    for (const name of ["colspan", "rowspan"]) {
      const value = attrs.get(name);
      if (value !== undefined && /^[1-9]\d?$/.test(value) && value !== "1") {
        kept.push(`${name}="${value}"`);
      }
    }
  }
  return kept.join(" ");
}

function sanitizeTag(tag: string, profile: SanitizeProfile): string {
  const match = tag.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)([\s\S]*?)>$/);
  if (!match) return "";
  const closing = match[1] === "/";
  const name = match[2].toLowerCase();
  const allowed = profile === "blog" ? BLOG_TAGS : QUIZ_TAGS;
  if (!allowed.has(name)) return "";
  if (closing) return VOID_TAGS.has(name) ? "" : `</${name}>`;

  const attributes = sanitizeTagAttributes(name, match[3] ?? "", profile);
  if (name === "br" || name === "hr") return `<${name}>`;
  if (name === "img") {
    return attributes.includes("src=") ? `<img ${attributes}>` : "";
  }
  // Un link senza destinazione valida perde il tag e resta il solo testo.
  if (name === "a") return attributes ? `<a ${attributes}>` : "";
  return attributes ? `<${name} ${attributes}>` : `<${name}>`;
}

export function sanitizeHtml(
  html: string,
  profile: SanitizeProfile = "quiz"
): string {
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
        return sanitizeTag(part, profile);
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

/**
 * Distanza temporale in parole ("adesso", "5 minuti fa", "3 ore fa",
 * "8 giorni fa", "2 mesi fa"): usa l'unità più adatta alla distanza.
 */
export function relativeTime(iso: string, now: number): string {
  const minutes = Math.floor(Math.max(0, now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "adesso";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuto" : "minuti"} fa`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "mese" : "mesi"} fa`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "anno" : "anni"} fa`;
}
