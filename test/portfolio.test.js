import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPortfolioSummary,
  PortfolioSchema,
  summarizePortfolio,
} from "../src/portfolio.js";
import {
  guardRoute,
  requiresFullReport,
} from "../src/agents/supervisor-agent.js";
import { extractUrls } from "../src/utils.js";

const portfolio = PortfolioSchema.parse([
  {
    symbol: "aapl",
    sector: "Technology",
    quantity: 2,
    purchase_price: 100,
    total_invested: 200,
    purchase_date: "2024-01-01",
  },
  {
    symbol: "JNJ",
    sector: "Healthcare",
    quantity: 1,
    purchase_price: 150,
    total_invested: 150,
    purchase_date: "2024-02-01",
  },
]);

test("portfolio schema normalizes symbols and summary calculates allocations", () => {
  assert.equal(portfolio[0].symbol, "AAPL");

  const summary = summarizePortfolio(portfolio);
  assert.equal(summary.totalInvested, 350);
  assert.equal(summary.sectors[0].sector, "Technology");
  assert.match(formatPortfolioSummary(summary), /Technology: \$200\.00 \(57\.1%\)/);
});

test("portfolio schema rejects invalid dates", () => {
  const invalid = structuredClone(portfolio);
  invalid[0].purchase_date = "yesterday";
  assert.equal(PortfolioSchema.safeParse(invalid).success, false);
});

test("supervisor guard enforces report dependencies", () => {
  const state = {
    completed: [],
    portfolioPath: "portfolio.json",
    marketResearch: "",
    query: "Analyze my portfolio and write a report",
  };

  assert.equal(guardRoute("doc_writer_agent", state), "read_portfolio_agent");
  assert.equal(
    guardRoute("doc_writer_agent", {
      ...state,
      completed: ["read_portfolio_agent"],
    }),
    "search_agent",
  );
});

test("supervisor allows narrow search questions to skip portfolio reading", () => {
  const state = {
    completed: [],
    portfolioPath: "portfolio.json",
    marketResearch: "",
    query: "What happened in technology markets today?",
  };

  assert.equal(requiresFullReport(state.query), false);
  assert.equal(guardRoute("search_agent", state), "search_agent");
});

test("extractUrls removes duplicates", () => {
  assert.deepEqual(extractUrls(["See https://example.com.", "https://example.com"]), [
    "https://example.com",
  ]);
});
