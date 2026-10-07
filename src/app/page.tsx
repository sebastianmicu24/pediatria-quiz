import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { QUIZ_STATS } from "@/lib/constants";

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-100 via-teal-50 to-emerald-100 blur-3xl" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:gap-14 sm:pb-20 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-medium text-brand-800 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {QUIZ_STATS.questions} quiz · {QUIZ_STATS.topics} argomenti · sempre gratuito
            </p>

            <h1 className="mt-6 text-balance text-3xl font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]">
              La pediatria si impara{" "}
              <span className="bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent">
                un quiz alla volta
              </span>
              .
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
              Pediatroma raccoglie domande di pediatria con spiegazioni
              dettagliate, filtrabili per argomento e difficoltà. Metti alla
              prova la tua preparazione, individua le lacune e monitora i
              progressi nel tempo.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <ButtonLink href="/registrati" size="lg" className="w-full sm:w-auto">
                Inizia gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink
                href="/login"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Hai già un account? Accedi
              </ButtonLink>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Spiegazioni per ogni risposta
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Statistiche personali
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Dati protetti, server in UE
              </li>
            </ul>
          </div>

          {/* Anteprima del quiz */}
          <div className="animate-fade-up lg:justify-self-end">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
                  Neonatologia
                </span>
                <span>Domanda 3 di 20</span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[15%] rounded-full bg-brand-500" />
              </div>

              <p className="mt-5 text-[15px] font-medium leading-relaxed text-slate-900">
                Il riflesso tonico asimmetrico del collo (ATNR) scompare a
                ______
              </p>

              <ul className="mt-4 space-y-2">
                {["6 mesi", "5 mesi", "9 mesi", "8 mesi"].map((option) => {
                  const isCorrect = option === "6 mesi";
                  return (
                    <li
                      key={option}
                      className={
                        isCorrect
                          ? "flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-900"
                          : "flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600"
                      }
                    >
                      {option}
                      {isCorrect ? (
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-600"
                          aria-hidden="true"
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Spiegazione. </span>
                Il riflesso tonico asimmetrico del collo scompare entro i 6–7
                mesi di vita postnatale. Una risposta tonica obbligatoria è
                sempre anomala e indica una patologia del SNC.
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Anteprima dell&apos;interfaccia quiz
            </p>
          </div>
        </div>
      </section>

      {/* ── Funzionalità ─────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Tutto ciò che serve per ripassare bene
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              Uno strumento essenziale, senza distrazioni: domande, spiegazioni
              e statistiche.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {[
              {
                icon: BookOpenCheck,
                title: `${QUIZ_STATS.questions} quiz con spiegazioni`,
                text: "Domande di pediatria corredate da spiegazioni chiare e riferimenti essenziali per il ripasso.",
              },
              {
                icon: Layers,
                title: `${QUIZ_STATS.topics} argomenti`,
                text: "Filtra per argomento e livello di difficoltà: concentrati su ciò che ti serve, quando ti serve.",
              },
              {
                icon: BarChart3,
                title: "Statistiche personali",
                text: "Precisione complessiva, risultati recenti e andamento per argomento: sai sempre dove migliorare.",
              },
              {
                icon: ShieldCheck,
                title: "Privacy by design",
                text: "Dati su server in UE, nessun tracciamento pubblicitario, esportazione ed eliminazione dei dati in un clic.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-shadow hover:shadow-md"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Come funziona ────────────────────────────────────── */}
      <section className="border-t border-slate-200">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Come funziona
          </h2>
          <div className="mt-10 grid gap-8 sm:mt-12 sm:grid-cols-3 sm:gap-10">
            {[
              {
                step: "1",
                title: "Crea l'account",
                text: "Registrazione in meno di un minuto con email e password. Nessuna carta di credito.",
              },
              {
                step: "2",
                title: "Scegli il quiz",
                text: "Seleziona argomento, difficoltà e numero di domande. Le domande vengono estratte a caso.",
              },
              {
                step: "3",
                title: "Allenati e cresci",
                text: "Rispondi, leggi le spiegazioni e controlla le statistiche per capire dove migliorare.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Domande frequenti
          </h2>
          <div className="mt-8 space-y-3 sm:mt-10">
            {[
              {
                q: "Pediatroma è gratuito?",
                a: "Sì. La registrazione e l'utilizzo dei quiz sono completamente gratuiti: serve solo un indirizzo email valido.",
              },
              {
                q: "I contenuti sostituiscono i libri di testo?",
                a: "No. I quiz sono uno strumento di autovalutazione e ripasso: non sostituiscono lo studio sui manuali né le linee guida ufficiali.",
              },
              {
                q: "Perché mi chiedete scuola, città e status?",
                a: "Sono dati facoltativi: ci aiutano a capire chi usa Pediatroma e a misurare in forma aggregata (mai individuale) come migliorano gli esiti degli studenti. Puoi compilarli, modificarli o rimuoverli in qualsiasi momento dalla pagina Account.",
              },
              {
                q: "Come vengono trattati i miei dati?",
                a: "I dati sono ospitati su infrastrutture con server in Unione Europea, protetti con connessioni cifrate. Non effettuiamo profilazione pubblicitaria né vendiamo dati. Puoi esportare o eliminare il tuo account in qualsiasi momento dalla pagina Account.",
              },
              {
                q: "Le spiegazioni sono affidabili?",
                a: "Le domande derivano da materiale di studio pediatrico e le spiegazioni sono riviste per finalità didattiche. In ambito clinico fanno sempre fede le linee guida ufficiali e il giudizio del medico.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4 open:bg-white open:shadow-sm sm:px-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-slate-900">
                  {faq.q}
                  <span className="text-slate-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA finale ───────────────────────────────────────── */}
      <section className="border-t border-slate-200">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-600 px-6 py-12 text-center shadow-xl sm:px-16 sm:py-14">
            <h2 className="text-balance text-2xl font-bold tracking-tight text-white sm:text-4xl">
              Pronto a metterti alla prova?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-50">
              Crea il tuo account gratuito su Pediatroma e inizia subito con il
              primo quiz di pediatria.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/registrati"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50 sm:w-auto"
              >
                Registrati gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/termini"
                className="text-sm font-medium text-brand-100 underline underline-offset-4 hover:text-white"
              >
                Leggi i termini prima di registrarti
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pb-16">
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
