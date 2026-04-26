export type MarginResult = {
  retailPriceCents: number;
  wholesaleCostCents: number;
  marginCents: number;
  marginPct: number;
};

/** Calculate gross margin from retail price and wholesale cost. */
export function calculateMargin(
  retailPriceCents: number,
  wholesaleCostCents: number
): MarginResult {
  const marginCents = retailPriceCents - wholesaleCostCents;
  const marginPct =
    retailPriceCents > 0 ? (marginCents / retailPriceCents) * 100 : 0;
  return { retailPriceCents, wholesaleCostCents, marginCents, marginPct };
}

/**
 * Suggest optimal retail price to hit a target gross margin.
 * Formula: retail = wholesale / (1 − targetMarginPct / 100)
 */
export function suggestOptimalPrice(
  wholesaleCostCents: number,
  targetMarginPct = 30
): number {
  if (targetMarginPct >= 100)
    throw new Error("Target margin must be < 100%");
  return Math.ceil(wholesaleCostCents / (1 - targetMarginPct / 100));
}

/** Format cents as a dollar string with two decimal places. */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export type SupplierCandidate = {
  supplierId: string;
  wholesaleCostCents: number;
  reliabilityScore: number; // 0–1
  stockLevel: number;
};

/**
 * Rank supplier candidates for a product.
 * Score = 60% cost-efficiency + 40% reliability. Out-of-stock excluded.
 */
export function rankSuppliers(
  candidates: SupplierCandidate[]
): SupplierCandidate[] {
  const inStock = candidates.filter((c) => c.stockLevel > 0);
  if (inStock.length === 0) return [];

  const maxCost = Math.max(...inStock.map((c) => c.wholesaleCostCents));

  return [...inStock].sort((a, b) => {
    const aCostScore = maxCost > 0 ? 1 - a.wholesaleCostCents / maxCost : 1;
    const bCostScore = maxCost > 0 ? 1 - b.wholesaleCostCents / maxCost : 1;
    const aScore = aCostScore * 0.6 + a.reliabilityScore * 0.4;
    const bScore = bCostScore * 0.6 + b.reliabilityScore * 0.4;
    return bScore - aScore;
  });
}
