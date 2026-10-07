/**
 * Converte il file train.jsonl (dataset di quiz di pediatria) in data/questions.json.
 *
 * Uso:
 *   node scripts/generate-data.mjs [percorso-train.jsonl]
 *
 * Se il percorso non viene indicato, usa quello predefinito del progetto locale.
 * L'output viene scritto in data/questions.json con lo schema:
 *   { id, source_id, question, options[], answer_index, topic, difficulty, explanation }
 * answer_index è convertito da 1-based (dataset) a 0-based.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DEFAULT_INPUT =
  "C:\\Users\\sebas\\Documents\\Progetto predefinito\\output\\train.jsonl";

const inputPath = resolve(process.argv[2] ?? DEFAULT_INPUT);
const outputPath = resolve(root, "data", "questions.json");

function log(...args) {
  console.log("[generate-data]", ...args);
}

let raw;
try {
  raw = readFileSync(inputPath, "utf8");
} catch (err) {
  console.error(`Impossibile leggere il file di input: ${inputPath}`);
  console.error(err.message);
  process.exit(1);
}

const lines = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

log(`Righe lette: ${lines.length}`);

const questions = [];
const skipped = [];

for (const [index, line] of lines.entries()) {
  const lineNumber = index + 1;
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    skipped.push({ lineNumber, reason: "JSON non valido" });
    continue;
  }

  if (row.error) {
    skipped.push({ lineNumber, reason: "riga con errore nel dataset" });
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
    skipped.push({ lineNumber, reason: "domanda mancante o malformata" });
    continue;
  }

  const answer = Number(q.answer);
  if (!Number.isInteger(answer) || answer < 1 || answer > q.options.length) {
    skipped.push({ lineNumber, reason: `risposta fuori intervallo (${q.answer})` });
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
}

// Rimuove i duplicati (stessa domanda scritta due volte).
const seen = new Map();
for (const q of questions) {
  const key = q.question.toLowerCase().replace(/\s+/g, " ");
  if (!seen.has(key)) seen.set(key, q);
}
const unique = [...seen.values()];

// Controllo duplicati di source_id (non deve mai accadere, la colonna è unique).
const idCount = new Map();
for (const q of unique) {
  idCount.set(q.source_id, (idCount.get(q.source_id) ?? 0) + 1);
}
const duplicateIds = [...idCount.entries()].filter(([, n]) => n > 1);
if (duplicateIds.length > 0) {
  console.error(
    "ERRORE: source_id duplicati:",
    duplicateIds.map(([id]) => id).join(", ")
  );
  process.exit(1);
}

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
if (unique.length !== questions.length) {
  log(`Duplicati rimossi: ${questions.length - unique.length}`);
}
if (skipped.length > 0) {
  log(`Righe scartate: ${skipped.length}`);
  for (const s of skipped) log(`  - riga ${s.lineNumber}: ${s.reason}`);
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
