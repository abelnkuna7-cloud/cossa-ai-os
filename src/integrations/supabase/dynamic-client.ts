/**
 * Typed adapter for tables that are present in the linked Supabase project but
 * not yet represented in the checked-in generated database types.
 *
 * Keep this surface intentionally small: it describes the PostgREST operations
 * used by legacy operational modules without treating their rows as `any`.
 */
export type DynamicRow = Record<string, unknown>;

export interface DynamicQueryError {
  message: string;
}

interface DynamicListResult<T> {
  data: T[] | null;
  error: DynamicQueryError | null;
  count?: number | null;
}

interface DynamicSingleResult<T> {
  data: T | null;
  error: DynamicQueryError | null;
}

interface DynamicOrderOptions {
  ascending?: boolean;
}

interface DynamicSelectOptions {
  count?: "exact";
  head?: boolean;
}

interface DynamicUpsertOptions {
  onConflict?: string;
}

export type DynamicSingleQuery<T> = PromiseLike<DynamicSingleResult<T>>;

export interface DynamicQuery<T = DynamicRow> extends PromiseLike<DynamicListResult<T>> {
  select(columns?: string, options?: DynamicSelectOptions): DynamicQuery<T>;
  insert(values: object | object[]): DynamicQuery<T>;
  upsert(values: object | object[], options?: DynamicUpsertOptions): DynamicQuery<T>;
  update(values: object): DynamicQuery<T>;
  delete(): DynamicQuery<T>;
  eq(column: string, value: unknown): DynamicQuery<T>;
  in(column: string, values: readonly unknown[]): DynamicQuery<T>;
  not(column: string, operator: string, value: unknown): DynamicQuery<T>;
  order(column: string, options?: DynamicOrderOptions): DynamicQuery<T>;
  limit(count: number): DynamicQuery<T>;
  range(from: number, to: number): DynamicQuery<T>;
  single(): DynamicSingleQuery<T>;
  maybeSingle(): DynamicSingleQuery<T>;
}

interface DynamicStorageResult {
  data: unknown;
  error: DynamicQueryError | null;
}

interface DynamicRpcResult<T> {
  data: T | null;
  error: DynamicQueryError | null;
}

interface DynamicStorageBucket {
  upload(
    path: string,
    file: Blob | File | ArrayBuffer | Uint8Array,
    options?: Record<string, unknown>,
  ): Promise<DynamicStorageResult>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
  remove(paths: string[]): Promise<DynamicStorageResult>;
}

export interface DynamicSupabaseClient {
  from<T = DynamicRow>(table: string): DynamicQuery<T>;
  rpc<T = unknown>(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<DynamicRpcResult<T>>;
  storage: {
    from(bucket: string): DynamicStorageBucket;
  };
}

export function asDynamicSupabaseClient(client: unknown): DynamicSupabaseClient {
  return client as DynamicSupabaseClient;
}
