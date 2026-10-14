/**
 * Converte i file .jsonl del dataset (train/test/extra) in data/questions.json.
 *
 * Uso:
 *   node scripts/generate-data.mjs [percorso-cartella-o-file]
 *
 * Se il percorso non viene indicato, usa la cartella predefinita del progetto
 * locale e legge TUTTI i file *.jsonl presenti (unione dei dataset).
 * L'output viene scritto in data/questions.json con lo schema:
 *   { id, source_id, question, options[], answer_index, topic, difficulty, explanation }
 * answer_index è convertito da 1-based (dataset) a 0-based.
 *
 * Ordine di preferenza per i duplicati tra file: train → test → extra → altri.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DEFAULT_INPUT_DIR =
  "C:\\Users\\sebas\\Documents\\Progetto predefinito\\output";

const PREFERRED_ORDER = ["train.jsonl", "test.jsonl", "extra.jsonl"];

const outputPath = resolve(root, "data", "questions.json");

function log(...args) {
  console.log("[generate-data]", ...args);
}

/** Risolve l'input (cartella o file) nell'elenco dei file .jsonl da leggere. */
function resolveInputFiles(inputArg) {
  const inputPath = resolve(inputArg ?? DEFAULT_INPUT_DIR);
  let stats;
  try {
    stats = statSync(inputPath);
  } catch {
    console.error(`Impossibile accedere al percorso: ${inputPath}`);
    process.exit(1);
  }

  if (!stats.isDirectory()) {
    return [inputPath];
  }

  const jsonlFiles = readdirSync(inputPath)
    .filter((name) => name.toLowerCase().endsWith(".jsonl"))
    .filter((name) => {
      try {
        return statSync(join(inputPath, name)).isFile();
      } catch {
        return false;
      }
    });

  // Ordine di preferenza esplicito, poi gli altri in ordine alfabetico.
  jsonlFiles.sort((a, b) => {
    const ia = PREFERRED_ORDER.indexOf(a.toLowerCase());
    const ib = PREFERRED_ORDER.indexOf(b.toLowerCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  if (jsonlFiles.length === 0) {
    console.error(`Nessun file .jsonl trovato in: ${inputPath}`);
    process.exit(1);
  }

  return jsonlFiles.map((name) => join(inputPath, name));
}

const inputFiles = resolveInputFiles(process.argv[2]);
log(`File di input (${inputFiles.length}):`);
for (const file of inputFiles) log(`  · ${file}`);

const questions = [];
const skipped = [];

for (const file of inputFiles) {
  const fileName = file.split(/[\\/]/).pop();
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (err) {
    console.error(`Impossibile leggere il file: ${file}`);
    console.error(err.message);
    process.exit(1);
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let validRows = 0;

  for (const [index, line] of lines.entries()) {
    const location = `${fileName} riga ${index + 1}`;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      skipped.push({ location, reason: "JSON non valido" });
      continue;
    }

    if (row.error) {
      skipped.push({ location, reason: "riga con errore nel dataset" });
      continue;
    }

    const q = row.response_json;
    if (
      !q ||
      typeof q.question !== "string" ||
      !q.question.trim() ||
      !Array.isArray(q.options) ||
      q.options.length < 2
    ) {
      skipped.push({ location, reason: "domanda mancante o malformata" });
      continue;
    }

    const answer = Number(q.answer);
    if (!Number.isInteger(answer) || answer < 1 || answer > q.options.length) {
      skipped.push({
        location,
        reason: `risposta fuori intervallo (${q.answer})`,
      });
      continue;
    }

    const question = q.question.trim();
    const sourceId =
      typeof row.id === "string" && row.id
        ? row.id
        : `local-${createHash("sha1").update(question).digest("hex").slice(0, 16)}`;

    questions.push({
      source_id: sourceId,
      question,
      options: q.options.map((o) => String(o).trim()),
      answer_index: answer - 1,
      topic:
        typeof q.topic === "string" && q.topic.trim() ? q.topic.trim() : "Generale",
      difficulty: [1, 2, 3].includes(Number(q.difficulty))
        ? Number(q.difficulty)
        : 2,
      explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
    });
    validRows++;
  }

  log(`Righe lette da ${fileName}: ${lines.length} (valide: ${validRows})`);
}

// Rimuove i duplicati per testo (stessa domanda scritta più volte),
// mantenendo la prima occorrenza nell'ordine di preferenza dei file.
const seenText = new Map();
for (const q of questions) {
  const key = q.question.toLowerCase().replace(/\s+/g, " ");
  if (!seenText.has(key)) seenText.set(key, q);
}
const uniqueByText = [...seenText.values()];

// Rimuove eventuali duplicati di source_id tra file (tiene la prima).
const seenId = new Map();
for (const q of uniqueByText) {
  if (!seenId.has(q.source_id)) seenId.set(q.source_id, q);
}
const unique = [...seenId.values()];

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(unique, null, 2) + "\n", "utf8");

// ── Statistiche ──────────────────────────────────────────────
const topics = new Map();
const difficulties = new Map();
for (const q of unique) {
  topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
  difficulties.set(q.difficulty, (difficulties.get(q.difficulty) ?? 0) + 1);
}

log(`Scritte ${unique.length} domande in ${outputPath}`);
if (uniqueByText.length !== questions.length) {
  log(`Duplicati (testo) rimossi: ${questions.length - uniqueByText.length}`);
}
if (unique.length !== uniqueByText.length) {
  log(`Duplicati (id) rimossi: ${uniqueByText.length - unique.length}`);
}
if (skipped.length > 0) {
  log(`Righe scartate: ${skipped.length}`);
  for (const s of skipped) log(`  - ${s.location}: ${s.reason}`);
}
log(`Argomenti (${topics.size}):`);
for (const [topic, count] of [...topics.entries()].sort((a, b) =>
  a[0].localeCompare(b[0], "it")
)) {
  log(`  · ${topic}: ${count}`);
}
log(
  "Difficoltà: " +
    [...difficulties.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([d, n]) => `${d}→${n}`)
      .join(", ")
);
