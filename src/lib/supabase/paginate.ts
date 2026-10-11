/**
 * Legge tutte le righe di una query Supabase a pagine:
 * l'API PostgREST restituisce al massimo 1000 righe per richiesta.
 */
export async function fetchAllRows<T>(
  makeQuery: () => {
    range: (
      from: number,
      to: number
    ) => PromiseLike<{
      data: unknown[] | null;
      error: { message: string } | null;
    }>;
  },
  maxRows = 50_000
): Promise<{ rows: T[]; error: string | null }> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) return { rows, error: error.message };
    if (!data) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break;
  }
  return { rows, error: null };
}
