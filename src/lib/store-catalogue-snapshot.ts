export type CatalogueSnapshotItem = {
  product_id: string;
  sku: string | null;
  slug: string | null;
  source_status: string | null;
  public_present: boolean;
};

export type CatalogueSnapshotComparison = {
  added: CatalogueSnapshotItem[];
  removed: CatalogueSnapshotItem[];
  activated: CatalogueSnapshotItem[];
  archived: CatalogueSnapshotItem[];
  drafted: CatalogueSnapshotItem[];
  publicAdditions: CatalogueSnapshotItem[];
  publicRemovals: CatalogueSnapshotItem[];
};

export function compareCatalogueSnapshots(
  previous: CatalogueSnapshotItem[],
  latest: CatalogueSnapshotItem[],
): CatalogueSnapshotComparison {
  const before = new Map(previous.map((item) => [item.product_id, item]));
  const after = new Map(latest.map((item) => [item.product_id, item]));
  const result: CatalogueSnapshotComparison = {
    added: [],
    removed: [],
    activated: [],
    archived: [],
    drafted: [],
    publicAdditions: [],
    publicRemovals: [],
  };

  for (const item of latest) {
    const old = before.get(item.product_id);
    if (!old) {
      result.added.push(item);
      continue;
    }
    if (old.source_status !== "active" && item.source_status === "active")
      result.activated.push(item);
    if (old.source_status !== "archived" && item.source_status === "archived")
      result.archived.push(item);
    if (old.source_status !== "draft" && item.source_status === "draft") result.drafted.push(item);
    if (!old.public_present && item.public_present) result.publicAdditions.push(item);
    if (old.public_present && !item.public_present) result.publicRemovals.push(item);
  }
  for (const item of previous) if (!after.has(item.product_id)) result.removed.push(item);
  return result;
}
