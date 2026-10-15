import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { QUIZ_STATS, formatNumber } from "@/lib/constants";
import { LEGAL } from "@/lib/legal";

const FEATURES = [
  {
    title: "Domande con spiegazione",
    text: "Dopo ogni risposta compare la spiegazione, con i riferimenti essenziali per il ripasso.",
  },
  {
    title: "Filtri per argomento e difficoltà",
    text: "Scegli uno o più argomenti e il livello: ti alleni su ciò che ti serve, quando ti serve.",
  },
  {
    title: "Ripasso mirato",
    text: "Riprendi solo le domande sbagliate o quelle mai viste. Ogni risposta aggiorna il tuo stato di ripasso.",
  },
  {
    title: "Statistiche personali",
    text: "Precisione, copertura per argomento e andamento nel tempo: sai sempre dove mancano punti.",
  },
  {
    title: "Dati protetti",
    text: "Server in UE, nessun tracciamento pubblicitario, esportazione ed eliminazione dei dati in un clic.",
  },
];

const STEPS = [
  {
    title: "Crea l'account",
    text: "Registrazione in meno di un minuto con email e password. Nessuna carta di credito.",
  },
  {
    title: "Scegli cosa ripassare",
    text: "Seleziona argomenti, difficoltà e stato di ripasso. Le domande arrivano una alla volta, finché vuoi.",
  },
  {
    title: "Controlla i progressi",
    text: "Leggi le spiegazioni, rivedi gli errori e consulta le statistiche per decidere cosa studiare dopo.",
  },
];

const FAQ = [
  {
    q: "pediatro.me è gratuito?",
    a: "Sì. La registrazione e l'utilizzo dei quiz sono completamente gratuiti: serve solo un indirizzo email valido.",
  },
  {
    q: "Non ho ricevuto l'email di conferma, cosa faccio?",
    a: `Controlla la posta indesiderata (spam). Se usi una casella istituzionale (es. universitaria), le email esterne possono essere bloccate dai filtri dell'ateneo: in quel caso scrivi a ${LEGAL.email} e confermeremo il tuo account manualmente.`,
  },
  {
    q: "I contenuti sostituiscono i libri di testo?",
    a: "No. I quiz sono uno strumento di autovalutazione e ripasso: non sostituiscono lo studio sui manuali né le linee guida ufficiali.",
  },
  {
    q: "Perché mi chiedete scuola, città e status?",
    a: "Sono dati facoltativi: ci aiutano a capire chi usa pediatro.me e a misurare in forma aggregata (mai individuale) come migliorano gli esiti degli studenti. Puoi compilarli, modificarli o rimuoverli in qualsiasi momento dalla pagina Account.",
  },
  {
    q: "Come vengono trattati i miei dati?",
    a: "I dati sono ospitati su infrastrutture con server in Unione Europea, protetti con connessioni cifrate. Non effettuiamo profilazione pubblicitaria né vendiamo dati. Puoi esportare o eliminare il tuo account in qualsiasi momento dalla pagina Account.",
  },
  {
    q: "Le spiegazioni sono affidabili?",
    a: "Le domande derivano da materiale di studio pediatrico e le spiegazioni sono riviste per finalità didattiche. In ambito clinico fanno sempre fede le linee guida ufficiali e il giudizio del medico.",
  },
];

const PREVIEW_OPTIONS = ["6 mesi", "5 mesi", "9 mesi", "8 mesi"];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">
              Per studenti, specializzandi e pediatri
            </p>
            <h1 className="mt-4 text-balance font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-900 sm:text-5xl lg:text-[3.5rem]">
              La pediatria si impara un quiz alla volta.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-neutral-600 sm:text-lg">
              pediatro.me raccoglie domande di pediatria con spiegazioni
              dettagliate, filtrabili per argomento e difficoltà. Individua le
              lacune, ripassa gli errori e misura i progressi nel tempo.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/registrati" size="lg">
                Crea un account gratuito
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg">
                Accedi
              </ButtonLink>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 border-t border-neutral-200">
              {[
                { value: formatNumber(QUIZ_STATS.questions), label: "domande" },
                { value: String(QUIZ_STATS.topics), label: "argomenti" },
                { value: "Gratis", label: "sempre" },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className={
                    index > 0
                      ? "border-l border-neutral-200 pl-4 pt-4"
                      : "pr-4 pt-4"
                  }
                >
                  <dd className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
                    {item.value}
                  </dd>
                  <dt className="mt-0.5 text-xs text-neutral-500">
                    {item.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <figure className="lg:justify-self-end">
            <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 text-xs text-neutral-500">
                <span className="font-medium text-neutral-800">
                  Neonatologia
                </span>
                <span className="tabular-nums">Domanda 3</span>
              </div>
              <div className="px-5 py-5">
                <p className="text-[15px] font-medium leading-relaxed text-neutral-900">
                  Il riflesso tonico asimmetrico del collo (ATNR) scompare a
                  ______
                </p>
                <ul className="mt-4 space-y-2" aria-hidden="true">
                  {PREVIEW_OPTIONS.map((option, index) => {
                    const isCorrect = index === 0;
                    return (
                      <li
                        key={option}
                        className={
                          isCorrect
                            ? "flex items-center gap-3 rounded-md border border-emerald-600 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-950"
                            : "flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2.5 text-sm text-neutral-500"
                        }
                      >
                        <span
                          className={
                            isCorrect
                              ? "flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-xs font-semibold text-white"
                              : "flex h-6 w-6 items-center justify-center rounded border border-neutral-300 text-xs font-medium text-neutral-500"
                          }
                        >
                          {isCorrect ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            "ABCD"[index]
                          )}
                        </span>
                        {option}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4 text-xs leading-relaxed text-neutral-600">
                <span className="font-semibold text-neutral-800">
                  Spiegazione.{" "}
                </span>
                Il riflesso tonico asimmetrico del collo scompare entro i 6–7
                mesi di vita postnatale. Una risposta tonica obbligatoria è
                sempre anomala e indica una patologia del SNC.
              </div>
            </div>
            <figcaption className="mt-3 text-xs text-neutral-400">
              Anteprima dell&apos;interfaccia quiz
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── Funzionalità ─────────────────────────────────────── */}
      <section>
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              Uno strumento per ripassare, senza distrazioni
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-neutral-600">
              Domande, spiegazioni e statistiche. Nient&apos;altro tra te e lo
              studio.
            </p>
          </div>

          <dl className="divide-y divide-neutral-200 border-y border-neutral-200">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6"
              >
                <dt className="text-[15px] font-semibold text-neutral-900">
                  {feature.title}
                </dt>
                <dd className="text-sm leading-relaxed text-neutral-600">
                  {feature.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Come funziona ────────────────────────────────────── */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Come funziona
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-2 border-neutral-900 pt-4">
                <p className="text-sm font-semibold tabular-nums text-brand-700">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-neutral-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Domande frequenti
          </h2>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-neutral-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    className="text-lg leading-none text-neutral-400 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Invito finale ────────────────────────────────────── */}
      <section className="bg-brand-700">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-white">
              Inizia dal primo quiz.
            </h2>
            <p className="mt-2 text-base leading-relaxed text-brand-100">
              Crea il tuo account gratuito: bastano un indirizzo email e un
              minuto.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink
              href="/registrati"
              variant="light"
              size="lg"
            >
              Registrati
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href="/termini"
              variant="onDark"
              size="lg"
            >
              Leggi i termini
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <MedicalDisclaimer className="max-w-3xl" />
      </div>
    </>
  );
}
