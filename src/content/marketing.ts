import { QUIZ_STATS, formatNumber } from "@/lib/constants";
import { LEGAL } from "@/lib/legal";

/**
 * Contenuto editoriale della landing page (/).
 *
 * Qui si modificano i testi delle sezioni: le voci restano in ordine di
 * apparizione e la pagina le mostra così come sono scritte. Per aggiungere
 * una voce basta aggiungere un elemento all'array; per toglierla, rimuoverlo.
 *
 * L'impaginazione resta in src/app/(marketing)/page.tsx.
 */

export type Feature = {
  title: string;
  text: string;
};

export const FEATURES: Feature[] = [
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

export const STEPS: Feature[] = [
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

export type FaqItem = {
  q: string;
  a: string;
};

export const FAQ: FaqItem[] = [
  {
    q: "pediatro.me è gratuito?",
    a: "Sì. La registrazione e l'utilizzo dei quiz sono completamente gratuiti: serve solo un indirizzo email valido.",
  },
  {
    q: "Non ho ricevuto l'email di conferma, cosa faccio?",
    a: `Controlla la posta indesiderata (spam). Se usi una casella istituzionale (es. universitaria), le email esterne possono essere bloccate dai filtri dell'ateneo: in quel caso scrivi a ${LEGAL.email} e confermeremo il tuo account manualmente.`,
  },
  {
    q: "Chi ha creato i quiz?",
    a: "I quiz sono stati tradotti dall'inglese da un grande database pubblico derivante principalmente dagli esami AIIMS & NEET PG. Sono stati selezionati automaticamente solo i quiz contenenti riferimenti a pazienti pediatrici. Ci potrebbero perciò essere quiz non inerenti alla specializzazione in pediatria.",
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
    a: "Le domande e le spiegazioni derivano da materiale creato da esperti e non dall'IA. Le informazioni potrebbero essere datate o potrebbero esserci errori di traduzione. In ambito clinico fanno sempre fede le linee guida ufficiali e il giudizio medico.",
  },
];

/**
 * Etichette dell'anteprima decorativa del quiz nell'hero: sono un mock
 * grafico, non un dato reale. Restano modificabili qui.
 */
export const PREVIEW_OPTIONS = ["6 mesi", "5 mesi", "9 mesi", "8 mesi", "3 mesi"];

/** Numeri mostrati sotto il titolo dell'hero (derivati dal dataset). */
export const HERO_STATS = [
  { value: formatNumber(QUIZ_STATS.questions), label: "domande" },
  { value: String(QUIZ_STATS.topics), label: "argomenti" },
  { value: "Gratis", label: "sempre" },
];
