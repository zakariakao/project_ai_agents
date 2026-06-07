import { TavilySearch } from "@langchain/tavily";
import { createAgent } from "langchain";
import { addCompleted, extractUrls, messageToText } from "../utils.js";

export function createSearchAgent(model) {
  const tavilyTool = new TavilySearch({
    maxResults: 8,
    topic: "finance",
    searchDepth: "advanced",
    includeAnswer: true,
    includeRawContent: false,
  });

  const agent = createAgent({
    model,
    tools: [tavilyTool],
    systemPrompt: `
You are the search_agent on an investment-analysis team.
Use Tavily to gather current, relevant, credible market information.
Focus on the user's question, portfolio symbols, sector trends, material risks,
recent performance drivers, and important macroeconomic context.
Prefer primary and reputable financial sources. Clearly separate facts from
interpretation. Include source URLs with every group of findings.
Do not make up prices, returns, events, or citations.
    `.trim(),
  });

  return async function searchAgentNode(state) {
    const prompt = `
User request:
${state.query}

Portfolio summary:
${state.portfolioSummary || "No portfolio has been loaded."}

Research the information needed to answer the request or prepare an investment
report. Return concise findings with source URLs.
    `.trim();

    const result = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });
    const finalMessage = result.messages.at(-1);

    return {
      marketResearch: messageToText(finalMessage),
      references: extractUrls(result.messages),
      completed: addCompleted(state.completed, "search_agent"),
    };
  };
}
