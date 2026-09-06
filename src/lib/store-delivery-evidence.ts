export type DeliveryEvidence = {
  dimensions: { length: number; width: number; height: number; kind: "product" | "package" | "carton" | "unknown"; evidence: string } | null;
  weight: { kg: number; kind: "product" | "package" | "shipping" | "unknown"; evidence: string } | null;
};

export function resolveDeliveryEnrichmentMode(value: string | undefined): "HOLD" | "CONTROLLED" | "ACTIVE" {
  const mode = (value ?? "").trim().toUpperCase();
  return mode === "CONTROLLED" || mode === "ACTIVE" ? mode : "HOLD";
}

export function parseStoreDeliveryEvidence(text: string): DeliveryEvidence {
  const normalised = text.replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const label = /(?:product\s+size|package\s+size|packed\s+dimensions?|carton\s+dimensions?|shipping\s+dimensions?|dimensions?|measurements?|size)\b/i;
  const dimensionMatch = normalised.match(new RegExp(`${label.source}[^.!?]{0,100}?(?:[lwh]\\s*)?([0-9]+(?:\\.[0-9]+)?)\\s*(cm|mm)?\\s*[x×*]\\s*(?:[lwh]\\s*)?([0-9]+(?:\\.[0-9]+)?)\\s*(cm|mm)?\\s*[x×*]\\s*(?:[lwh]\\s*)?([0-9]+(?:\\.[0-9]+)?)\\s*(cm|mm)`, "i"));
  const dimensionUnit = dimensionMatch?.[6]?.toLowerCase() ?? dimensionMatch?.[2]?.toLowerCase();
  const dimensionKind = /carton/i.test(dimensionMatch?.[0] ?? "") ? "carton" : /package|packed|shipping/i.test(dimensionMatch?.[0] ?? "") ? "package" : /product/i.test(dimensionMatch?.[0] ?? "") ? "product" : "unknown";
  const weightMatch = normalised.match(/(?:net\s+weight|gross\s+weight|shipping\s+weight|package\s+weight|packed\s+weight|product\s+weight|weight)\b[^.!?]{0,80}?([0-9]+(?:\.[0-9]+)?)\s*(kg|g)\b/i);
  const weightKind = /shipping/i.test(weightMatch?.[0] ?? "") ? "shipping" : /package|packed|gross/i.test(weightMatch?.[0] ?? "") ? "package" : /product|net/i.test(weightMatch?.[0] ?? "") ? "product" : "unknown";
  const dimensions = dimensionMatch ? {
    length: Number(dimensionMatch[1]) * (dimensionUnit === "mm" ? 0.1 : 1),
    width: Number(dimensionMatch[3]) * ((dimensionMatch[4] ?? dimensionMatch[6])?.toLowerCase() === "mm" ? 0.1 : 1),
    height: Number(dimensionMatch[5]) * (dimensionMatch[6]?.toLowerCase() === "mm" ? 0.1 : 1),
    kind: dimensionKind,
    evidence: dimensionMatch[0].slice(0, 500),
  } : null;
  const weight = weightMatch ? { kg: weightMatch[2].toLowerCase() === "g" ? Number(weightMatch[1]) / 1000 : Number(weightMatch[1]), kind: weightKind, evidence: weightMatch[0].slice(0, 500) } : null;
  return {
    dimensions: dimensions && [dimensions.length, dimensions.width, dimensions.height].every((value) => value > 0 && value < 1000) ? dimensions : null,
    weight: weight && weight.kg > 0 ? weight : null,
  };
}
