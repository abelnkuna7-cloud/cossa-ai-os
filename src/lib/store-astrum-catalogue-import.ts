import { createHash } from "node:crypto";

export type AstrumRow = {
  sku: string;
  name: string;
  price: number | null;
  srpPrice: number | null;
  stock: number | null;
  category: string;
};
export type IntakeEvidence = {
  id: string;
  supplierProductRef: string;
  supplierCost: number | null;
  supplierRrp: number | null;
  supplierAvailableStock: number | null;
  stockStatus: "available" | "unavailable" | "unknown";
};
export type ImportEventType =
  | "accepted"
  | "rejected"
  | "new"
  | "unchanged"
  | "stock_changed"
  | "cost_changed"
  | "rrp_changed"
  | "unavailable"
  | "back_in_stock"
  | "missing_from_source";
export type ImportEvent = {
  type: ImportEventType;
  sku: string;
  rowHash: string;
  reason?: string;
  previous?: Record<string, unknown>;
  observed?: Record<string, unknown>;
};
export type ImportPlan = {
  contentHash: string;
  rows: AstrumRow[];
  events: ImportEvent[];
  upserts: AstrumRow[];
  counts: Record<string, number>;
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const value = (raw: string | undefined): number | null => {
  const parsed = Number(raw ?? "");
  return Number.isFinite(parsed) ? parsed : null;
};
const clean = (raw: string | undefined) => (raw ?? "").trim();

export function parseAstrumCsv(text: string): AstrumRow[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift()?.split(",") ?? [];
  const position = (name: string) => headers.indexOf(name);
  return lines.map((line) => {
    const cells: string[] = [];
    let cell = "",
      quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        quoted = !quoted;
      } else if (ch === "," && !quoted) {
        cells.push(cell);
        cell = "";
      } else cell += ch;
    }
    cells.push(cell);
    return {
      sku: clean(cells[position("sku")]),
      name: clean(cells[position("name")]),
      price: value(cells[position("price")]),
      srpPrice: value(cells[position("srp_price")]),
      stock: value(cells[position("stock")]),
      category: clean(cells[position("category")]),
    };
  });
}

export function planAstrumImport(source: string, existing: IntakeEvidence[]): ImportPlan {
  const rows = parseAstrumCsv(source);
  const bySku = new Map(
    existing.map((item) => [item.supplierProductRef.trim().toLowerCase(), item]),
  );
  const seen = new Set<string>();
  const events: ImportEvent[] = [];
  const upserts: AstrumRow[] = [];
  const counts: Record<string, number> = {
    sourceRows: rows.length,
    acceptedRows: 0,
    rejectedRows: 0,
    newSkus: 0,
    updatedSkus: 0,
    unchangedSkus: 0,
    availableSkus: 0,
    unavailableSkus: 0,
    supplierAvailableUnits: 0,
    stockChanges: 0,
    costChanges: 0,
    rrpChanges: 0,
    newlyUnavailable: 0,
    backInStock: 0,
    missingFromSource: 0,
  };
  for (const row of rows) {
    const rowHash = hash(JSON.stringify(row));
    const key = row.sku.toLowerCase();
    if (!row.sku || !row.name || row.price == null || row.price <= 0) {
      counts.rejectedRows++;
      events.push({
        type: "rejected",
        sku: row.sku,
        rowHash,
        reason: "Missing SKU/name or invalid supplier cost",
      });
      continue;
    }
    counts.acceptedRows++;
    seen.add(key);
    if ((row.stock ?? 0) > 0) {
      counts.availableSkus++;
      counts.supplierAvailableUnits += row.stock ?? 0;
    } else counts.unavailableSkus++;
    const prior = bySku.get(key);
    if (!prior) {
      counts.newSkus++;
      upserts.push(row);
      events.push({ type: "accepted", sku: row.sku, rowHash });
      events.push({ type: "new", sku: row.sku, rowHash });
      continue;
    }
    const priorEvidence = {
      stock: prior.supplierAvailableStock,
      cost: prior.supplierCost,
      rrp: prior.supplierRrp,
    };
    const observed = { stock: row.stock, cost: row.price, rrp: row.srpPrice };
    let changed = false;
    if (prior.supplierAvailableStock !== row.stock) {
      counts.stockChanges++;
      changed = true;
      events.push({
        type: "stock_changed",
        sku: row.sku,
        rowHash,
        previous: priorEvidence,
        observed,
      });
      if ((prior.supplierAvailableStock ?? 0) > 0 && (row.stock ?? 0) === 0) {
        counts.newlyUnavailable++;
        events.push({
          type: "unavailable",
          sku: row.sku,
          rowHash,
          previous: priorEvidence,
          observed,
        });
      }
      if ((prior.supplierAvailableStock ?? 0) === 0 && (row.stock ?? 0) > 0) {
        counts.backInStock++;
        events.push({
          type: "back_in_stock",
          sku: row.sku,
          rowHash,
          previous: priorEvidence,
          observed,
        });
      }
    }
    if (prior.supplierCost !== row.price) {
      counts.costChanges++;
      changed = true;
      events.push({
        type: "cost_changed",
        sku: row.sku,
        rowHash,
        reason: "PRICING REVIEW REQUIRED",
        previous: priorEvidence,
        observed,
      });
    }
    if (prior.supplierRrp !== row.srpPrice) {
      counts.rrpChanges++;
      changed = true;
      events.push({
        type: "rrp_changed",
        sku: row.sku,
        rowHash,
        reason: "PRICING REVIEW REQUIRED",
        previous: priorEvidence,
        observed,
      });
    }
    if (changed) {
      counts.updatedSkus++;
      upserts.push(row);
      events.push({ type: "accepted", sku: row.sku, rowHash });
    } else {
      counts.unchangedSkus++;
      events.push({ type: "unchanged", sku: row.sku, rowHash });
    }
  }
  for (const prior of existing)
    if (!seen.has(prior.supplierProductRef.trim().toLowerCase())) {
      counts.missingFromSource++;
      events.push({
        type: "missing_from_source",
        sku: prior.supplierProductRef,
        rowHash: hash(prior.supplierProductRef),
        reason: "Absent from latest complete supplier source",
      });
    }
  return { contentHash: hash(source), rows, events, upserts, counts };
}
