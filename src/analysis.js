import { assertApiKeys, getConfig } from "./config.js";
import { createPortfolioGraph } from "./graph.js";

export async function runPortfolioAnalysis({
  query,
  portfolioPath = "Web interface portfolio",
  portfolioInput,
  outputPath = "reports/portfolio-report.md",
}) {
  assertApiKeys();
  const config = getConfig();
  const graph = createPortfolioGraph({ modelName: config.openAiModel });

  return graph.invoke(
    {
      query,
      portfolioPath,
      portfolioInput,
      outputPath,
    },
    { recursionLimit: 15 },
  );
}
