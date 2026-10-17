/**
 * Test del sanitizzatore HTML: casi legittimi ammessi e vettori di
 * attacco rimossi. Esegui con: npm run test:sanitize
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvLocal();

const { sanitizeHtml } = await import("../src/lib/utils.ts");

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const goodImage = `${base}/storage/v1/object/public/quiz-images/questions/abc-123.png`;

const cases = [
  // [descrizione, input, deveContenere, nonDeveContenere]
  ["grassetto e paragrafi", "<p>Ciao <strong>mondo</strong> <em>corsivo</em></p>", "<strong>mondo</strong>", null],
  ["sottolineato", "<p><u>sottolineato</u></p>", "<u>sottolineato</u>", null],
  ["barrato", "<p><s>barrato</s></p>", "<s>barrato</s>", null],
  ["colore testo", '<span style="color: #ff0000">rosso</span>', 'style="color: #ff0000"', null],
  [
    "dimensione + font",
    '<span style="font-size: 18px; font-family: Georgia">x</span>',
    'style="font-size: 18px; font-family: Georgia"',
    null,
  ],
  ["evidenziazione", '<span style="background-color: yellow">ev</span>', "background-color: yellow", null],
  ["allineamento centro", '<p style="text-align: center">testo</p>', 'style="text-align: center"', null],
  ["allineamento giustificato", '<p style="text-align: justify">testo</p>', 'style="text-align: justify"', null],
  [
    "allineamento + immagine inline",
    `<p style="text-align: right">testo <img src="${goodImage}" alt="x"> coda</p>`,
    'style="text-align: right"',
    null,
  ],
  [
    "immagine dal bucket",
    `<p>testo</p><img src="${goodImage}" alt="Figura" width="300">`,
    `src="${goodImage}"`,
    null,
  ],
  ["alt con virgolette", `<img src="${goodImage}" alt='a"b'>`, 'alt="a&quot;b"', null],
  ["alt con tag nel testo", `<img src="${goodImage}" alt='a"b<c>'>`, null, "onclick"],

  // Attacchi
  ["script", "<p>ciao</p><script>alert(1)</script>", "<p>ciao</p>", "<script"],
  ["iframe", '<iframe src="https://evil.com"></iframe><p>ok</p>', "<p>ok</p>", "<iframe"],
  ["immagine esterna", '<img src="https://evil.com/x.png">', null, "<img"],
  ["onerror su img", `<img src="${goodImage}" onerror="alert(1)">`, null, "onerror"],
  ["link javascript:", '<a href="javascript:alert(1)">clicca</a>', "clicca", "<a"],
  ["stile con url()", '<span style="background: url(javascript:alert(1))">x</span>', null, "url("],
  ["stile con expression", '<span style="color: expression(alert(1))">x</span>', null, "expression"],
  [
    "allineamento con valore pericoloso",
    '<p style="text-align: expression(alert(1))">x</p>',
    null,
    "style=",
  ],
  [
    "allineamento + proprietà non ammesse",
    '<p style="text-align: center; background: url(https://evil.com)">x</p>',
    'style="text-align: center"',
    "url(",
  ],
  [
    "text-align non ammesso sugli span",
    '<span style="text-align: center">x</span>',
    null,
    "style=",
  ],
  ["attributo onclick", '<p onclick="alert(1)">testo</p>', "testo", "onclick"],
  ["data URL base64", '<img src="data:image/png;base64,AAAA">', null, "<img"],
  ["svg inline", '<svg onload="alert(1)"></svg><p>ok</p>', "<p>ok</p>", "<svg"],
  ["tag malformato neutralizzato", '<img src="x" onclick="alert(1)"', "&lt;img", "<img"],
  [
    "tag malformato a metà stringa",
    '<p>prima</p> <img src=x onerror=alert(1)> <p>dopo</p>',
    "<p>dopo</p>",
    "onerror",
  ],
  ["stile senza virgolette", "<span style=color:red>x</span>", null, "style="],
  ["font-size fuori scala", '<span style="font-size: 9999px">x</span>', null, "9999"],
  ["doppia codifica", "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>", "&lt;script&gt;", null],

  // Pulsanti verso il blog nelle spiegazioni dei quiz
  [
    "pulsante del blog",
    '<p>Leggi <a href="/blog/bronchiolite-acuta" data-blog-button="true">Bronchiolite</a></p>',
    '<a href="/blog/bronchiolite-acuta" data-blog-button="true" target="_blank" rel="noopener">Bronchiolite</a>',
    null,
  ],
  ["link senza data-blog-button", '<a href="/blog/x-y">x</a>', "x", "<a"],
  ["link esterno nel quiz", '<a href="https://evil.com" data-blog-button="true">x</a>', "x", "<a"],
  ["pulsante verso altro percorso", '<a href="/admin/utenti" data-blog-button="true">x</a>', "x", "<a"],
  ["pulsante con query", '<a href="/blog/x-y?a=1" data-blog-button="true">x</a>', "x", "<a"],
  ["pulsante con maiuscole nello slug", '<a href="/blog/AbC" data-blog-button="true">x</a>', "x", "<a"],
  [
    "pulsante: attributi extra scartati",
    '<a href="/blog/ab-c" data-blog-button="true" onclick="alert(1)" style="x:y">x</a>',
    'href="/blog/ab-c"',
    "onclick",
  ],
  ["quiz: titoli non ammessi", "<h2>t</h2>", "t", "<h2"],
  ["quiz: tabelle non ammesse", "<table><tr><td>t</td></tr></table>", "t", "<table"],

  // Blog
  ["blog: titoli", "<h2>Titolo</h2><h3>Sotto</h3><h4>Sotto2</h4>", "<h2>Titolo</h2>", null, "blog"],
  ["blog: titolo allineato", '<h2 style="text-align: center">T</h2>', 'style="text-align: center"', null, "blog"],
  ["blog: h1 non ammesso", "<h1>T</h1>", "T", "<h1", "blog"],
  [
    "blog: citazione, linea, apici",
    "<blockquote><p>q</p></blockquote><hr><p>H<sub>2</sub>O m<sup>2</sup></p>",
    "<hr>",
    null,
    "blog",
  ],
  [
    "blog: tabella",
    '<table><tbody><tr><th colspan="2">a</th></tr><tr><td>b</td><td>c</td></tr></tbody></table>',
    '<th colspan="2">a</th>',
    null,
    "blog",
  ],
  [
    "blog: stile sulla tabella rimosso",
    '<table style="position:fixed"><tr><td style="x:y">a</td></tr></table>',
    "<table>",
    "style",
    "blog",
  ],
  [
    "blog: link esterno",
    '<a href="https://www.example.org/pagina?a=1&amp;b=2">x</a>',
    'href="https://www.example.org/pagina?a=1&amp;b=2" target="_blank" rel="noopener noreferrer nofollow"',
    null,
    "blog",
  ],
  ["blog: link interno senza target", '<a href="/blog/altro-articolo">x</a>', 'href="/blog/altro-articolo"', "target", "blog"],
  ["blog: mailto", '<a href="mailto:info@example.org">x</a>', 'href="mailto:info@example.org"', null, "blog"],
  ["blog: javascript:", '<a href="javascript:alert(1)">x</a>', "x", "<a", "blog"],
  ["blog: javascript: maiuscole", '<a href="JaVaScRiPt:alert(1)">x</a>', "x", "<a", "blog"],
  ["blog: javascript: con spazio", '<a href=" java script:alert(1)">x</a>', "x", "<a", "blog"],
  ["blog: javascript: con a capo", '<a href="java\nscript:alert(1)">x</a>', "x", "<a", "blog"],
  ["blog: javascript: con entità", '<a href="&#106;avascript:alert(1)">x</a>', "x", "<a", "blog"],
  ["blog: vbscript:", '<a href="vbscript:msgbox(1)">x</a>', "x", "<a", "blog"],
  ["blog: data:", '<a href="data:text/html;base64,AAAA">x</a>', "x", "<a", "blog"],
  ["blog: protocol-relative", '<a href="//evil.com">x</a>', "x", "<a", "blog"],
  ["blog: backslash", '<a href="/\\evil.com">x</a>', "x", "<a", "blog"],
  ["blog: credenziali nell'URL", '<a href="https://user:pw@evil.com">x</a>', "x", "<a", "blog"],
  [
    "blog: attributi extra sul link",
    '<a href="https://example.org" onclick="alert(1)" target="_self">x</a>',
    'target="_blank"',
    "onclick",
    "blog",
  ],
  [
    "blog: virgolette nell'href",
    `<a href='https://example.org/"onmouseover="alert(1)'>x</a>`,
    "x",
    'onmouseover="',
    "blog",
  ],
  ["blog: immagine esterna", '<img src="https://evil.com/x.png">', null, "<img", "blog"],
  ["blog: immagine del bucket", `<img src="${goodImage}" alt="f">`, `src="${goodImage}"`, null, "blog"],
  ["blog: script", "<p>ok</p><script>alert(1)</script>", "<p>ok</p>", "<script", "blog"],
  ["blog: iframe", '<iframe src="https://evil.com"></iframe>', null, "<iframe", "blog"],
  ["blog: onerror", "<img src=x onerror=alert(1)>", null, "onerror", "blog"],
  [
    "blog: stile sul testo",
    '<span style="color:#ae1c33;background-color:#fbe4e8">x</span>',
    "color: #ae1c33",
    null,
    "blog",
  ],
];

let failures = 0;
for (const [label, input, expected, forbidden, profile] of cases) {
  const output = sanitizeHtml(input, profile);
  const okExpected = expected === null || output.includes(expected);
  const okForbidden = forbidden === null || !output.includes(forbidden);
  if (okExpected && okForbidden) {
    console.log(`OK   ${label}`);
  } else {
    failures++;
    console.log(`FAIL ${label}`);
    console.log(`     input:  ${input}`);
    console.log(`     output: ${output}`);
  }
}

console.log(failures === 0 ? "\nTutti i casi superati." : `\n${failures} casi falliti.`);
process.exit(failures === 0 ? 0 : 1);
