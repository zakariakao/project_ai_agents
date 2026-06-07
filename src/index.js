import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runPortfolioAnalysis } from "./analysis.js";

const DEFAULT_QUERY =
  "Analyze this portfolio using current market information and write a detailed report with actionable recommendations.";

export function parseArgs(args) {
  const parsed = {
    portfolio: "data/sample-portfolio.json",
    output: "reports/portfolio-report.md",
    query: DEFAULT_QUERY,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) continue;

    const key = argument.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    if (!(key in parsed)) {
      throw new Error(`Unknown option: --${key}`);
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`Analyzing ${resolve(args.portfolio)}...`);

  const result = await runPortfolioAnalysis({
    query: args.query,
    portfolioPath: args.portfolio,
    outputPath: args.output,
  });

  console.log(`Completed agents: ${result.completed.join(" -> ")}`);
  if (result.report) {
    console.log(`Report written to ${result.outputPath}`);
  } else {
    console.log(result.marketResearch || result.portfolioSummary);
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
