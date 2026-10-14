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
];

let failures = 0;
for (const [label, input, expected, forbidden] of cases) {
  const output = sanitizeHtml(input);
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
