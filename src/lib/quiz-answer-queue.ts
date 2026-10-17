import type { QuizAnswerInput } from "@/lib/types";

/** Esito di un invio, come lo restituisce la Server Action `recordQuizAnswer`. */
export type AnswerSendResult = "saved" | "skipped" | "retry" | "unavailable";

export type AnswerQueueState =
  | "idle"
  /** Invio in corso. */
  | "saving"
  /** Tutto salvato. */
  | "saved"
  /** Invio fallito: si riprova da soli. */
  | "error"
  /** Le RPC di sessione non esistono ancora: si salva tutto a fine esercitazione. */
  | "unavailable";

export type AnswerQueue = {
  /** Mette in coda una risposta (l'invio parte subito). */
  push: (answer: QuizAnswerInput) => void;
  /** Prova a svuotare la coda e restituisce ciò che non è stato salvato. */
  flush: () => Promise<QuizAnswerInput[]>;
  /** Svuota la coda senza inviare (esercitazione scartata). */
  reset: () => void;
  /** Ferma i tentativi automatici (smontaggio del componente). */
  dispose: () => void;
  /** Risposte confermate dal server in questa sessione. */
  savedCount: () => number;
  state: () => AnswerQueueState;
};

/** Attese fra un tentativo e il successivo (poi si ripete l'ultima). */
const RETRY_DELAYS_MS = [1500, 4000, 10000, 30000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Coda di salvataggio delle risposte.
 *
 * Ogni risposta viene inviata appena l'utente risponde; se la rete cade
 * l'invio viene ritentato con attese crescenti e la risposta resta in
 * coda, pronta per essere inclusa in "Termina" (`finishQuizSession`).
 * Le risposte sono indicizzate per domanda: un doppio invio della stessa
 * risposta non crea lavoro inutile (e lato database è idempotente).
 *
 * Non conosce React: notifica i cambi di stato con `onState`, così il
 * componente resta una semplice vista.
 */
export function createAnswerQueue({
  send,
  onState,
}: {
  send: (answer: QuizAnswerInput) => Promise<AnswerSendResult>;
  onState?: (state: AnswerQueueState) => void;
}): AnswerQueue {
  const pending = new Map<string, QuizAnswerInput>();
  let currentState: AnswerQueueState = "idle";
  let unavailable = false;
  let saved = 0;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let draining: Promise<void> | null = null;

  function setState(next: AnswerQueueState) {
    if (currentState === next) return;
    currentState = next;
    onState?.(next);
  }

  function scheduleRetry() {
    if (timer || unavailable || pending.size === 0) return;
    const delay =
      RETRY_DELAYS_MS[Math.min(failures - 1, RETRY_DELAYS_MS.length - 1)];
    timer = setTimeout(() => {
      timer = null;
      void startDrain();
    }, delay);
  }

  async function runDrain() {
    while (pending.size > 0) {
      const entry = pending.entries().next().value as
        | [string, QuizAnswerInput]
        | undefined;
      if (!entry) return;
      const [key, answer] = entry;

      let result: AnswerSendResult;
      try {
        result = await send(answer);
      } catch {
        result = "retry";
      }

      if (result === "unavailable") {
        // Migrazione non applicata: si smette di provare e si salva
        // tutto insieme a fine esercitazione (comportamento storico).
        unavailable = true;
        setState("unavailable");
        return;
      }

      if (result === "retry") {
        failures += 1;
        setState("error");
        scheduleRetry();
        return;
      }

      // "saved" o "skipped" (risposta ignorata dal server: mai ritentarla).
      pending.delete(key);
      if (result === "saved") saved += 1;
      failures = 0;
    }

    setState(saved > 0 ? "saved" : "idle");
  }

  /** Un solo invio in volo: le risposte non si accavallano. */
  function startDrain(): Promise<void> {
    if (draining) return draining;
    if (unavailable) return Promise.resolve();
    draining = runDrain().finally(() => {
      draining = null;
    });
    return draining;
  }

  return {
    push(answer) {
      if (unavailable) return;
      // Ultima risposta per quella domanda: sostituisce l'eventuale
      // precedente e va in fondo alla coda.
      pending.delete(answer.questionId);
      pending.set(answer.questionId, answer);
      if (currentState !== "error") setState("saving");
      void startDrain();
    },

    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // Fino a tre giri ravvicinati: se la rete è ancora giù, le
      // risposte rimaste vengono passate a "Termina", che le registra
      // lato server prima di chiudere il tentativo.
      for (let round = 0; round < 3 && pending.size > 0 && !unavailable; round += 1) {
        failures = 0;
        await startDrain();
        if (pending.size > 0 && round < 2) await wait(300);
      }
      return [...pending.values()];
    },

    reset() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending.clear();
      failures = 0;
      saved = 0;
    },

    dispose() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },

    savedCount: () => saved,
    state: () => currentState,
  };
}
