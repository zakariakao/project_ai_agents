import { ChatOpenAI } from "@langchain/openai";
import {
  END,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { z } from "zod";
import { createDocWriterAgent } from "./agents/doc-writer-agent.js";
import { readPortfolioAgent } from "./agents/read-portfolio-agent.js";
import { createSearchAgent } from "./agents/search-agent.js";
import {
  AGENTS,
  createSupervisorAgent,
} from "./agents/supervisor-agent.js";
import { PortfolioItemSchema } from "./portfolio.js";

const GraphState = new StateSchema({
  query: z.string().min(1),
  portfolioPath: z.string().min(1),
  outputPath: z.string().default("reports/portfolio-report.md"),
  portfolio: z.array(PortfolioItemSchema).default(() => []),
  portfolioSummary: z.string().default(""),
  marketResearch: z.string().default(""),
  references: z.array(z.string()).default(() => []),
  report: z.string().default(""),
  completed: z.array(z.enum(AGENTS)).default(() => []),
  next: z.enum([...AGENTS, "FINISH"]).default("read_portfolio_agent"),
  supervisorReason: z.string().default(""),
});

export function createPortfolioGraph({ modelName }) {
  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
  });

  const supervisorAgent = createSupervisorAgent(model);
  const searchAgent = createSearchAgent(model);
  const docWriterAgent = createDocWriterAgent(model);

  return new StateGraph(GraphState)
    .addNode("team_supervisor", supervisorAgent)
    .addNode("search_agent", searchAgent)
    .addNode("read_portfolio_agent", readPortfolioAgent)
    .addNode("doc_writer_agent", docWriterAgent)
    .addEdge(START, "team_supervisor")
    .addConditionalEdges("team_supervisor", (state) => {
      return state.next === "FINISH" ? END : state.next;
    })
    .addEdge("search_agent", "team_supervisor")
    .addEdge("read_portfolio_agent", "team_supervisor")
    .addEdge("doc_writer_agent", "team_supervisor")
    .compile();
}
