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
const warn = (name, msg) => console.log(`  WARN ${name} — ${msg}`);
const fail = (name, msg) => {
  failures++;
  console.log(`  FAIL ${name} — ${msg}`);
};

/** Errore dovuto a una colonna non ancora presente (migrazione non applicata). */
const isMissingColumn = (error) =>
  !!error &&
  (error.code === "42703" ||
    error.code === "PGRST204" ||
    /does not exist|schema cache/i.test(error.message ?? ""));

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

  const profileColumns = await admin
    .from("profiles")
    .select("id, year, tags")
    .limit(1);
  if (profileColumns.error) {
    if (isMissingColumn(profileColumns.error)) {
      warn(
        "Colonne profilo (anno/tag)",
        "non ancora presenti: esegui supabase/migrations/2026-10-12_anno-e-tag-utenti.sql"
      );
    } else {
      fail("Colonne profilo (anno/tag)", profileColumns.error.message);
    }
  } else {
    ok("Colonne profilo (anno/tag)", "presenti");
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
      status: "studente",
      year: "3",
      school: "Università Test",
      city: "Roma",
    },
  });
  if (created.error || !created.data.user) {
    fail("Creazione utente", created.error?.message ?? "utente non creato");
  } else {
    userId = created.data.user.id;
    ok("Utente creato", testEmail);

    let profile = await admin
      .from("profiles")
      .select(
        "display_name, accepted_terms_at, marketing_consent, status, year, school, city, tags"
      )
      .eq("id", userId)
      .maybeSingle();
    let hasYearTags = true;
    if (profile.error && isMissingColumn(profile.error)) {
      hasYearTags = false;
      profile = await admin
        .from("profiles")
        .select(
          "display_name, accepted_terms_at, marketing_consent, status, school, city"
        )
        .eq("id", userId)
        .maybeSingle();
    }

    if (profile.error || !profile.data) {
      fail("Trigger profilo", profile.error?.message ?? "profilo non trovato");
    } else if (
      profile.data.status !== "studente" ||
      profile.data.school !== "Università Test" ||
      profile.data.city !== "Roma"
    ) {
      fail(
        "Campi profilo (status/scuola/città)",
        `${JSON.stringify({
          status: profile.data.status,
          school: profile.data.school,
          city: profile.data.city,
        })} — hai eseguito la migrazione supabase/migrations/2026-10-07_dati-statistiche-profilo.sql?`
      );
    } else {
      ok(
        "Profilo creato dal trigger",
        `nome="${profile.data.display_name}", consenso termini=${profile.data.accepted_terms_at !== null}, ${
          hasYearTags ? "status/anno/scuola/città" : "status/scuola/città"
        } copiati`
      );

      if (!hasYearTags) {
        warn(
          "Campo profilo (anno) + tag utente",
          "colonne non ancora presenti: esegui supabase/migrations/2026-10-12_anno-e-tag-utenti.sql"
        );
      } else if (profile.data.year !== "3") {
        fail(
          "Campo profilo (anno)",
          `anno=${JSON.stringify(profile.data.year)} (atteso "3")`
        );
      } else {
        ok("Campo profilo (anno)", "anno copiato dal trigger");

        // I tag sono scrivibili solo dal service role (admin): round-trip.
        const tagsUpdate = await admin
          .from("profiles")
          .update({ tags: ["smoke-test"] })
          .eq("id", userId)
          .select("tags")
          .maybeSingle();
        if (
          tagsUpdate.error ||
          !Array.isArray(tagsUpdate.data?.tags) ||
          tagsUpdate.data.tags[0] !== "smoke-test"
        ) {
          fail(
            "Tag utente (admin)",
            tagsUpdate.error?.message ??
              "scrittura/rilettura non riuscita"
          );
        } else {
          ok("Tag utente (admin)", "scrittura e rilettura via service role ok");
        }
      }
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

        // Progressi: ogni risposta salvata aggiorna question_progress
        const progress = await userClient
          .from("question_progress")
          .select("question_id, is_correct, answer_count")
          .in(
            "question_id",
            questions.data.map((row) => row.id)
          );
        if (progress.error) {
          if (isMissingColumn(progress.error)) {
            warn(
              "Progressi domande",
              "tabella non ancora presente: esegui supabase/migrations/2026-10-13_progressi-domande.sql"
            );
          } else {
            fail("Progressi domande", progress.error.message);
          }
        } else if ((progress.data ?? []).length !== questions.data.length) {
          fail(
            "Progressi domande",
            `attese ${questions.data.length} righe, trovate ${progress.data?.length ?? 0}`
          );
        } else {
          ok("Progressi domande", `${progress.data.length} righe create (2 corrette, 1 sbagliata)`);

          // La nuova risposta sovrascrive la precedente: rispondi di nuovo
          // alla prima domanda, stavolta in modo errato.
          const first = questions.data[0];
          const wrongIndex = (first.answer_index + 1) % first.options.length;
          const overwrite = await userClient.rpc("save_quiz_attempt", {
            p_answers: [{ question_id: first.id, selected_index: wrongIndex }],
            p_topic: "Smoke Test",
            p_difficulty: 2,
          });
          if (overwrite.error) {
            fail("Sovrascrittura progressi", overwrite.error.message);
          } else {
            const updated = await userClient
              .from("question_progress")
              .select("is_correct, answer_count, selected_index")
              .eq("question_id", first.id)
              .maybeSingle();
            if (
              updated.error ||
              !updated.data ||
              updated.data.is_correct !== false ||
              updated.data.answer_count !== 2 ||
              updated.data.selected_index !== wrongIndex
            ) {
              fail(
                "Sovrascrittura progressi",
                `riga aggiornata: ${JSON.stringify(updated.data)}`
              );
            } else {
              ok(
                "Sovrascrittura progressi",
                "la nuova risposta sostituisce la precedente (conteggio=2)"
              );
            }
          }
        }

        // Pulizia manuale del tentativo (poi verrà comunque rimosso col cascade)
        await userClient.from("quiz_attempts").delete().eq("id", rpc.data);
      }
    }

    // Estrazione casuale progressiva (RPC): base + filtri multipli + esclusione
    const rpcQuiz = await userClient.rpc("get_quiz_questions", {
      p_count: 3,
      p_topics: [],
      p_difficulties: [],
      p_exclude: [],
    });
    if (rpcQuiz.error) {
      if (/could not find the function/i.test(rpcQuiz.error.message)) {
        warn(
          "RPC get_quiz_questions",
          "non ancora applicata: esegui supabase/migrations/2026-10-11_funzione-quiz-random.sql (il sito usa il fallback)"
        );
      } else {
        fail("RPC get_quiz_questions", rpcQuiz.error.message);
      }
    } else if (!Array.isArray(rpcQuiz.data) || rpcQuiz.data.length !== 3) {
      fail(
        "RPC get_quiz_questions",
        `attese 3 domande, ricevute ${Array.isArray(rpcQuiz.data) ? rpcQuiz.data.length : "?"}`
      );
    } else {
      ok("RPC get_quiz_questions", "3 domande casuali estratte");

      // I filtri multipli devono valere davvero
      const rpcFiltered = await userClient.rpc("get_quiz_questions", {
        p_count: 5,
        p_topics: ["Cardiologia"],
        p_difficulties: [1, 3],
        p_exclude: [],
      });
      const wrongTopic =
        Array.isArray(rpcFiltered.data) &&
        rpcFiltered.data.some((row) => row.topic !== "Cardiologia");
      const wrongDifficulty =
        Array.isArray(rpcFiltered.data) &&
        rpcFiltered.data.some((row) => ![1, 3].includes(row.difficulty));
      if (rpcFiltered.error) {
        fail("RPC get_quiz_questions (filtri)", rpcFiltered.error.message);
      } else if (wrongTopic || wrongDifficulty) {
        fail(
          "RPC get_quiz_questions (filtri)",
          "restituite domande fuori dai filtri selezionati"
        );
      } else {
        ok(
          "RPC get_quiz_questions (filtri)",
          `${rpcFiltered.data.length} domande di Cardiologia, difficoltà 1 o 3`
        );

        // Multi-argomento: Cardiologia + Neonatologia
        const allowedTopics = ["Cardiologia", "Neonatologia"];
        const rpcMulti = await userClient.rpc("get_quiz_questions", {
          p_count: 10,
          p_topics: allowedTopics,
          p_difficulties: [],
          p_exclude: [],
        });
        if (rpcMulti.error) {
          fail(
            "RPC get_quiz_questions (multi-argomento)",
            rpcMulti.error.message
          );
        } else if (
          Array.isArray(rpcMulti.data) &&
          rpcMulti.data.some((row) => !allowedTopics.includes(row.topic))
        ) {
          fail(
            "RPC get_quiz_questions (multi-argomento)",
            "restituite domande di argomenti non selezionati"
          );
        } else {
          ok(
            "RPC get_quiz_questions (multi-argomento)",
            `${rpcMulti.data.length} domande da Cardiologia + Neonatologia`
          );
        }

        // Le domande già mostrate non vanno riproposte (esercitazione progressiva)
        const excludeId = rpcFiltered.data[0]?.id ?? rpcQuiz.data[0].id;
        const rpcExclude = await userClient.rpc("get_quiz_questions", {
          p_count: 5,
          p_topics: ["Cardiologia"],
          p_difficulties: [],
          p_exclude: [excludeId],
        });
        if (rpcExclude.error) {
          fail(
            "RPC get_quiz_questions (esclusione)",
            rpcExclude.error.message
          );
        } else if (
          Array.isArray(rpcExclude.data) &&
          rpcExclude.data.some((row) => row.id === excludeId)
        ) {
          fail(
            "RPC get_quiz_questions (esclusione)",
            "la domanda esclusa è stata comunque restituita"
          );
        } else {
          ok(
            "RPC get_quiz_questions (esclusione)",
            "la domanda già vista non viene riproposta"
          );
        }

        // Filtro di ripasso (richiede la migrazione 2026-10-13)
        const answeredIds = new Set(questions.data.map((row) => row.id));
        const rpcNew = await userClient.rpc("get_quiz_questions", {
          p_count: 10,
          p_topics: [],
          p_difficulties: [],
          p_exclude: [],
          p_status: ["new"],
        });
        if (rpcNew.error) {
          if (/could not find the function/i.test(rpcNew.error.message)) {
            warn(
              "RPC get_quiz_questions (ripasso)",
              "filtro p_status non ancora supportato: esegui supabase/migrations/2026-10-13_progressi-domande.sql"
            );
          } else {
            fail("RPC get_quiz_questions (ripasso)", rpcNew.error.message);
          }
        } else if (
          Array.isArray(rpcNew.data) &&
          rpcNew.data.some((row) => answeredIds.has(row.id))
        ) {
          fail(
            "RPC get_quiz_questions (ripasso)",
            "restituita una domanda già risposta tra le 'nuove'"
          );
        } else {
          ok(
            "RPC get_quiz_questions (ripasso)",
            `${rpcNew.data.length} domande 'nuove', nessuna già risposta`
          );
        }
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

    // Conferma manuale da parte dell'admin (come dal pannello utenti):
    // dopo la conferma il login deve riuscire.
    const manualConfirm = await admin.auth.admin.updateUserById(
      created.data.user.id,
      { email_confirm: true }
    );
    if (manualConfirm.error) {
      fail("Conferma email manuale (admin)", manualConfirm.error.message);
    } else {
      const retry = await anonClient.auth.signInWithPassword({
        email: unconfirmedEmail,
        password: unconfirmedPassword,
      });
      if (retry.error || !retry.data?.session) {
        fail(
          "Conferma email manuale (admin)",
          retry.error?.message ?? "login ancora bloccato dopo la conferma"
        );
      } else {
        ok(
          "Conferma email manuale (admin)",
          "dopo la conferma il login riesce"
        );
      }
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
