import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

export const PortfolioItemSchema = z.object({
  symbol: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  sector: z.string().trim().min(1),
  quantity: z.number().positive(),
  purchase_price: z.number().nonnegative(),
  total_invested: z.number().nonnegative(),
  purchase_date: z.iso.date(),
});

export const PortfolioSchema = z.array(PortfolioItemSchema).min(1);

export async function readPortfolio(portfolioPath) {
  const absolutePath = resolve(portfolioPath);
  const raw = await readFile(absolutePath, "utf8");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Portfolio is not valid JSON: ${error.message}`);
  }

  const result = PortfolioSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Portfolio validation failed:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}

export function summarizePortfolio(portfolio) {
  const totalInvested = portfolio.reduce(
    (sum, holding) => sum + holding.total_invested,
    0,
  );
  const sectorTotals = new Map();

  for (const holding of portfolio) {
    sectorTotals.set(
      holding.sector,
      (sectorTotals.get(holding.sector) ?? 0) + holding.total_invested,
    );
  }

  const sectors = [...sectorTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, amount]) => ({
      sector,
      amount,
      percentage: totalInvested === 0 ? 0 : (amount / totalInvested) * 100,
    }));

  return {
    holdingCount: portfolio.length,
    symbols: portfolio.map((holding) => holding.symbol),
    totalInvested,
    sectors,
  };
}

export function formatPortfolioSummary(summary) {
  const sectorLines = summary.sectors
    .map(
      ({ sector, amount, percentage }) =>
        `- ${sector}: $${amount.toFixed(2)} (${percentage.toFixed(1)}%)`,
    )
    .join("\n");

  return [
    `Holdings: ${summary.holdingCount}`,
    `Symbols: ${summary.symbols.join(", ")}`,
    `Total invested: $${summary.totalInvested.toFixed(2)}`,
    "Sector allocation:",
    sectorLines,
  ].join("\n");
}
