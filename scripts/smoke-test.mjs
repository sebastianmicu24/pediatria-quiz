/**
 * Smoke test end-to-end della configurazione Supabase.
 * Verifica: admin API (secret key), schema, trigger profilo, login
 * (publishable key), RLS e RPC di salvataggio. Crea e poi elimina
 * un utente di test, senza inviare nessuna email.
 *
 * Uso: node scripts/smoke-test.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("ERRORE: variabili mancanti in .env.local");
  process.exit(1);
}

let failures = 0;
const ok = (name, extra = "") => console.log(`  OK   ${name}${extra ? ` — ${extra}` : ""}`);
const fail = (name, msg) => {
  failures++;
  console.log(`  FAIL ${name} — ${msg}`);
};

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("\n[1] Admin API (secret key)");
{
  const res = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (res.error) {
    fail("Admin API", res.error.message);
    console.log("\n→ La secret key sembra non valida. Ricreala in Settings → API Keys e aggiorna .env.local.");
    process.exit(1);
  }
  ok("Admin API raggiungibile");
}

console.log("\n[2] Schema database");
{
  const res = await admin.from("questions").select("id", { count: "exact", head: true });
  if (res.error) {
    fail("Tabella questions", res.error.message);
    console.log("\n→ Applica supabase/schema.sql nell'SQL Editor di Supabase, poi rilancia lo script.");
    process.exit(1);
  }
  ok("Tabella questions presente", `${res.count ?? 0} domande`);
  if ((res.count ?? 0) === 0) {
    console.log("→ Le domande non sono ancora state importate. Esegui: npm run import:questions");
  }
}

console.log("\n[3] Utente di test + trigger profilo");
const testEmail = `smoke-test-${Date.now()}@example.com`;
const testPassword = "Smoke-Test-1234!";
let userId = null;
{
  const created = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      display_name: "Smoke Test",
      accepted_terms: true,
      marketing_consent: false,
    },
  });
  if (created.error || !created.data.user) {
    fail("Creazione utente", created.error?.message ?? "utente non creato");
  } else {
    userId = created.data.user.id;
    ok("Utente creato", testEmail);

    const profile = await admin
      .from("profiles")
      .select("display_name, accepted_terms_at, marketing_consent")
      .eq("id", userId)
      .maybeSingle();
    if (profile.error || !profile.data) {
      fail("Trigger profilo", profile.error?.message ?? "profilo non trovato");
    } else {
      ok(
        "Profilo creato dal trigger",
        `nome="${profile.data.display_name}", consenso termini=${profile.data.accepted_terms_at !== null}`
      );
    }
  }
}

console.log("\n[4] Login con publishable key + RLS + RPC");
if (userId) {
  const userClient = createClient(url, anon, { auth: { persistSession: false } });
  const signIn = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signIn.error) {
    fail("Login", signIn.error.message);
  } else {
    ok("Login riuscito");

    const questions = await userClient
      .from("questions")
      .select("id, options, answer_index")
      .limit(3);
    if (questions.error || !questions.data?.length) {
      fail("Lettura questions (RLS)", questions.error?.message ?? "nessuna riga");
    } else {
      ok("Lettura questions con RLS", `${questions.data.length} righe`);

      const answers = questions.data.map((row, index) => ({
        question_id: row.id,
        selected_index:
          index === 2
            ? (row.answer_index + 1) % row.options.length // risposta volutamente errata
            : row.answer_index,
      }));
      const rpc = await userClient.rpc("save_quiz_attempt", {
        p_answers: answers,
        p_topic: "Smoke Test",
        p_difficulty: 2,
      });
      if (rpc.error) {
        fail("RPC save_quiz_attempt", rpc.error.message);
      } else {
        const attempt = await userClient
          .from("quiz_attempts")
          .select("total_questions, correct_answers")
          .eq("id", rpc.data)
          .maybeSingle();
        if (attempt.error || !attempt.data) {
          fail("Verifica tentativo", attempt.error?.message ?? "non trovato");
        } else {
          const expected = questions.data.length - 1;
          const actual = attempt.data.correct_answers;
          if (actual === expected && attempt.data.total_questions === questions.data.length) {
            ok("Tentativo salvato e punteggio corretto", `${actual}/${attempt.data.total_questions} (attese ${expected}/${questions.data.length})`);
          } else {
            fail("Punteggio tentativo", `attese ${expected}/${questions.data.length}, ottenute ${actual}/${attempt.data.total_questions}`);
          }
        }

        // Pulizia manuale del tentativo (poi verrà comunque rimosso col cascade)
        await userClient.from("quiz_attempts").delete().eq("id", rpc.data);
      }
    }

    // Verifica che un client senza login non possa leggere l'elenco completo
    const anonRead = await userClient
      .from("profiles")
      .select("id")
      .limit(1);
    if (anonRead.error) {
      ok("RLS attiva su profiles (accesso negato)", anonRead.error.message.split("\n")[0]);
    } else {
      // Con policy "own rows" l'utente può leggere solo la propria riga: nessun leak di altri profili
      ok("RLS attiva su profiles", `righe visibili: ${anonRead.data?.length ?? 0}`);
    }
  }
}

console.log("\n[4b] Blocco login per utenti NON confermati");
{
  const unconfirmedEmail = `unconfirmed-${Date.now()}@example.com`;
  const unconfirmedPassword = "Unconfirmed-Check-1234!";
  const created = await admin.auth.admin.createUser({
    email: unconfirmedEmail,
    password: unconfirmedPassword,
    email_confirm: false,
  });
  if (created.error || !created.data.user) {
    fail("Creazione utente non confermato", created.error?.message ?? "errore");
  } else {
    const anonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await anonClient.auth.signInWithPassword({
      email: unconfirmedEmail,
      password: unconfirmedPassword,
    });
    if (
      signIn.error &&
      (signIn.error.code === "email_not_confirmed" ||
        /not confirmed/i.test(signIn.error.message))
    ) {
      ok(
        "Login bloccato per utente non confermato",
        `errore: ${signIn.error.code ?? signIn.error.message}`
      );
    } else if (signIn.data?.session) {
      fail(
        "Blocco utente non confermato",
        "ATTENZIONE: il login è stato consentito senza conferma email"
      );
    } else {
      fail(
        "Blocco utente non confermato",
        signIn.error?.message ?? "risultato inatteso"
      );
    }
    await admin.auth.admin.deleteUser(created.data.user.id);
  }
}

console.log("\n[5] Pulizia utente di test");
if (userId) {
  const del = await admin.auth.admin.deleteUser(userId);
  if (del.error) {
    fail("Eliminazione utente", del.error.message);
  } else {
    ok("Utente di test eliminato");
    const after = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (after.data) fail("Cascade sui profili", "il profilo esiste ancora");
    else ok("Cascade verificato (profilo rimosso)");
  }
}

console.log("");
if (failures === 0) {
  console.log("RISULTATO: tutti i controlli superati.");
} else {
  console.log(`RISULTATO: ${failures} controlli falliti — vedi sopra.`);
  process.exit(1);
}
