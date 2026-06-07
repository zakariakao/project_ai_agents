import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server.js";

async function withServer(analyzePortfolio, callback) {
  const server = createAppServer({ analyzePortfolio });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("web server serves the interface and API status", async () => {
  await withServer(async () => ({}), async (baseUrl) => {
    const pageResponse = await fetch(baseUrl);
    assert.equal(pageResponse.status, 200);
    const page = await pageResponse.text();
    assert.match(page, /Portfolio Agent Studio/);
    assert.match(page, /id="loading-state" hidden/);

    const stylesResponse = await fetch(`${baseUrl}/styles.css`);
    assert.match(await stylesResponse.text(), /\[hidden\]\s*\{\s*display: none !important;/);

    const statusResponse = await fetch(`${baseUrl}/api/status`);
    assert.equal(statusResponse.status, 200);
    assert.equal(typeof (await statusResponse.json()).keys.openAi, "boolean");
  });
});

test("analysis API validates input and returns agent results", async () => {
  const mockResult = {
    report: "# Test report",
    portfolioSummary: "Holdings: 1",
    marketResearch: "Research",
    references: [],
    completed: ["read_portfolio_agent", "search_agent", "doc_writer_agent"],
  };

  await withServer(async () => mockResult, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "Analyze this portfolio",
        portfolio: [
          {
            symbol: "AAPL",
            sector: "Technology",
            quantity: 1,
            purchase_price: 100,
            total_invested: 100,
            purchase_date: "2024-01-01",
          },
        ],
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.report, "# Test report");
    assert.match(body.outputPath, /^reports\/web-report-/);
  });
});
