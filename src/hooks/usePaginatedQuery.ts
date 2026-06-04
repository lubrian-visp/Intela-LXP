import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Paginated Query Hook
 *
 * Automatically fetches all rows from a Supabase table by paginating
 * in batches of 1000 (Supabase's default row limit). This prevents
 * silent data truncation on large datasets.
 *
 * Usage:
 *   const { data, isLoading } = usePaginatedQuery("profiles", {
 *     select: "id, full_name, email",
 *     filters: [{ column: "status", op: "eq", value: "active" }],
 *     orderBy: { column: "created_at", ascending: false },
 *   });
 */

interface PaginatedFilter {
  column: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "is";
  value: unknown;
}

interface PaginatedQueryConfig {
  select?: string;
  filters?: PaginatedFilter[];
  orderBy?: { column: string; ascending?: boolean };
  pageSize?: number;
  enabled?: boolean;
}

const DEFAULT_PAGE_SIZE = 1000;

async function fetchAllRows(
  table: string,
  config: PaginatedQueryConfig
): Promise<any[]> {
  const pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;
  const allRows: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = (supabase as any)
      .from(table)
      .select(config.select ?? "*", { count: "exact" })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (config.filters) {
      for (const f of config.filters) {
        if (f.op === "in") {
          query = query.in(f.column, f.value as any[]);
        } else if (f.op === "is") {
          query = query.is(f.column, f.value);
        } else {
          query = query[f.op](f.column, f.value);
        }
      }
    }

    // Apply ordering
    if (config.orderBy) {
      query = query.order(config.orderBy.column, {
        ascending: config.orderBy.ascending ?? true,
      });
    }

    const { data, error, count } = await query;

    if (error) throw error;

    allRows.push(...(data ?? []));
    offset += pageSize;

    // Stop if we got fewer rows than page size or reached total count
    if ((data ?? []).length < pageSize) {
      hasMore = false;
    } else if (count !== null && offset >= count) {
      hasMore = false;
    }
  }

  return allRows;
}

export function usePaginatedQuery(
  table: string,
  config: PaginatedQueryConfig = {},
  queryOptions?: Partial<UseQueryOptions<any[], Error>>
) {
  return useQuery<any[], Error>({
    queryKey: [
      "paginated",
      table,
      config.select,
      config.filters,
      config.orderBy,
    ],
    queryFn: () => fetchAllRows(table, config),
    enabled: config.enabled !== false,
    ...queryOptions,
  });
}

/**
 * Utility function for one-off paginated fetches outside of React components.
 * Returns a promise of all rows.
 */
export async function fetchPaginatedRows(
  table: string,
  config: PaginatedQueryConfig = {}
): Promise<any[]> {
  return fetchAllRows(table, config);
}
