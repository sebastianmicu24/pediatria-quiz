/**
 * Importa le domande (data/questions.json) nella tabella public.questions di Supabase.
 *
 * Uso:
 *   npm run import:questions            # importa su Supabase
 *   node scripts/import-questions.mjs --print-sql > supabase/seed.sql
 *                                       # genera lo SQL da incollare nell'SQL Editor
 *
 * Variabili lette da .env.local (o dall'ambiente):
 *   NEXT_PUBLIC_SUPABASE_URL (oppure SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Caricamento .env.local (senza dipendenze esterne) ─────────
function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const questionsPath = resolve(root, "data", "questions.json");
if (!existsSync(questionsPath)) {
  console.error(
    "File data/questions.json non trovato. Esegui prima: npm run generate:data"
  );
  process.exit(1);
}

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
console.log(`Domande da importare: ${questions.length}`);

// ── Modalità --print-sql ──────────────────────────────────────
if (process.argv.includes("--print-sql")) {
  const quote = (text) => `$q$${text}$q$`;
  const rows = questions
    .map(
      (q) =>
        `  (${quote(q.source_id)}, ${quote(q.question)}, ${quote(
          JSON.stringify(q.options)
        )}::jsonb, ${q.answer_index}, ${quote(q.topic)}, ${q.difficulty}, ${quote(
          q.explanation
        )})`
    )
    .join(",\n");
  const sql = `-- Seed delle domande di Pediatroma (generato da scripts/import-questions.mjs)
insert into public.questions (source_id, question, options, answer_index, topic, difficulty, explanation)
values
${rows}
on conflict (source_id) do update set
  question = excluded.question,
  options = excluded.options,
  answer_index = excluded.answer_index,
  topic = excluded.topic,
  difficulty = excluded.difficulty,
  explanation = excluded.explanation;
`;
  process.stdout.write(sql);
  process.exit(0);
}

// ── Import su Supabase ────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Accetta sia "SUPABASE_SECRET_KEY" (nuovo nome Supabase) sia
// "SUPABASE_SERVICE_ROLE_KEY" (nome storico).
const serviceKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Configurazione mancante: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY) in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_SIZE = 100;
let imported = 0;

for (let i = 0; i < questions.length; i += BATCH_SIZE) {
  const batch = questions.slice(i, i + BATCH_SIZE);
  const { error } = await supabase
    .from("questions")
    .upsert(batch, { onConflict: "source_id", ignoreDuplicates: false });

  if (error) {
    console.error(`Errore nel lotto ${i}–${i + batch.length}:`, error.message);
    process.exit(1);
  }
  imported += batch.length;
  console.log(`  → importate ${imported}/${questions.length}`);
}

console.log("Import completato.");
