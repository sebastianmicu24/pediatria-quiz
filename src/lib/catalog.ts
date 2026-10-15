import { cacheLife, cacheTag } from "next/cache";
import { measured } from "@/lib/perf";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Catalogo degli argomenti (docs/PERFORMANCE.md § 5.B).
 *
 * L'elenco degli argomenti e il numero di domande disponibili per
 * ciascuno stanno nella vista `question_topic_counts` (19 righe). Prima
 * di questa vista ogni pagina che ne aveva bisogno leggeva l'intera
 * tabella `questions` (12.449 righe, 13 richieste paginate): qui la
 * lettura avviene una volta e viene memorizzata da Next (Cache
 * Components), con il tag `questions` per poterla aggiornare a mano
 * quando le domande cambiano.
 */

/** Tag di cache del catalogo: lo invalida chi modifica le domande. */
export const QUESTIONS_TAG = "questions";

export type TopicCatalogEntry = {
  topic: string;
  /** Domande disponibili per questo argomento. */
  available: number;
};

/** Lettura diretta (nessuna cache). null = vista non disponibile. */
async function readTopicCatalog(): Promise<TopicCatalogEntry[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await measured(
      "question_topic_counts",
      () =>
        admin
          .from("question_topic_counts")
          .select("topic, available")
          .order("topic", { ascending: true }),
      (result) => ({ rows: result.data?.length ?? 0, code: result.error?.code })
    );
    // Vista non ancora creata (migrazione non applicata) o errore di
    // configurazione: chi chiama decide come degradare.
    if (error) return null;
    return (data ?? []).map((row) => ({
      topic: String(row.topic),
      available: Number(row.available) || 0,
    }));
  } catch {
    return null;
  }
}

/** Stessa lettura, memorizzata da Next. */
async function readTopicCatalogCached(): Promise<TopicCatalogEntry[] | null> {
  "use cache";
  // Le domande cambiano solo dagli strumenti admin (che invalidano il
  // tag) o dagli script di import: un'ora di vita è prudente.
  cacheLife("hours");
  cacheTag(QUESTIONS_TAG);
  return readTopicCatalog();
}

/**
 * Argomenti con il numero di domande disponibili, in ordine alfabetico.
 * Restituisce un elenco vuoto se la vista non esiste ancora.
 */
export async function getTopicCatalog(): Promise<TopicCatalogEntry[]> {
  const cached = await readTopicCatalogCached();
  if (cached && cached.length > 0) return cached;

  // Elenco vuoto = vista assente (o database non configurato): non va
  // memorizzato a lungo, altrimenti dopo la migrazione la pagina
  // continuerebbe a mostrare un catalogo vuoto. Si rilegge dal database
  // (una query che, senza la vista, risponde subito con un errore).
  return (await readTopicCatalog()) ?? [];
}
