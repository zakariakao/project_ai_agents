import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { addCompleted, messageToText } from "../utils.js";

const REPORT_OUTLINE = `
# Introduction on Market Landscape
# Portfolio Overview
# Investment Strategy
# Performance Analysis
# Recommendations
# Conclusion
# References
`.trim();

export function createDocWriterAgent(model) {
  return async function docWriterAgent(state) {
    const response = await model.invoke([
      new SystemMessage(`
You are the doc_writer_agent on an investment-analysis team.
Write a clear, detailed Markdown report using exactly the requested outline.
Base every claim on the provided portfolio and research. Cite source URLs inline
and list them under References. State limitations when current prices or other
facts are unavailable. Recommendations must be actionable but framed as
educational analysis, not individualized financial advice.
      `.trim()),
      new HumanMessage(`
User request:
${state.query}

Required outline:
${REPORT_OUTLINE}

Portfolio JSON:
${JSON.stringify(state.portfolio, null, 2)}

Portfolio summary:
${state.portfolioSummary}

Market research:
${state.marketResearch}

Collected references:
${state.references.map((url) => `- ${url}`).join("\n")}
      `.trim()),
    ]);

    const report = messageToText(response);
    const outputPath = resolve(state.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${report.trim()}\n`, "utf8");

    return {
      report,
      outputPath,
      completed: addCompleted(state.completed, "doc_writer_agent"),
    };
  };
}
