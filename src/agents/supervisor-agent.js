import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

export const AGENTS = [
  "search_agent",
  "read_portfolio_agent",
  "doc_writer_agent",
];

const RouteDecisionSchema = z.object({
  next: z
    .enum([...AGENTS, "FINISH"])
    .describe("The next specialist to run, or FINISH when the request is complete."),
  reason: z.string().describe("A short explanation of the routing decision."),
});

export function requiresFullReport(query) {
  return /\b(analy[sz]e|analysis|report|recommend|strategy|performance|risk|optimi[sz]e)\b/i.test(
    query,
  );
}

export function guardRoute(requestedRoute, state) {
  const completed = new Set(state.completed ?? []);

  if (requiresFullReport(state.query ?? "")) {
    if (!completed.has("read_portfolio_agent")) return "read_portfolio_agent";
    if (!completed.has("search_agent")) return "search_agent";
    if (!completed.has("doc_writer_agent")) return "doc_writer_agent";
    return "FINISH";
  }

  if (completed.has("doc_writer_agent")) return "FINISH";

  if (completed.has(requestedRoute)) {
    if (!completed.has("doc_writer_agent") && state.marketResearch) {
      return "doc_writer_agent";
    }
    return "FINISH";
  }

  if (requestedRoute === "doc_writer_agent") {
    if (!completed.has("read_portfolio_agent")) return "read_portfolio_agent";
    if (!completed.has("search_agent")) return "search_agent";
  }

  return requestedRoute;
}

export function createSupervisorAgent(model) {
  const router = model.withStructuredOutput(RouteDecisionSchema);

  return async function supervisorAgent(state) {
    const decision = await router.invoke([
      new SystemMessage(`
You are the team_supervisor for an investment portfolio multi-agent system.
Route work to one specialist at a time:
- read_portfolio_agent reads and summarizes the JSON portfolio.
- search_agent uses Tavily to retrieve current market information.
- doc_writer_agent writes the final detailed investment report.

For a full portfolio analysis or report, use all three specialists in that
dependency order. For a narrower request, call only the specialists needed.
Never call a completed specialist again. Choose FINISH when the user's request
has been satisfied.
      `.trim()),
      new HumanMessage(`
User request: ${state.query}
Portfolio path: ${state.portfolioPath}
Completed specialists: ${(state.completed ?? []).join(", ") || "none"}
Portfolio loaded: ${state.portfolio.length > 0}
Market research available: ${Boolean(state.marketResearch)}
Report written: ${Boolean(state.report)}
      `.trim()),
    ]);

    const next = guardRoute(decision.next, state);
    return {
      next,
      supervisorReason: decision.reason,
    };
  };
}
