import {
  formatPortfolioSummary,
  readPortfolio,
  summarizePortfolio,
} from "../portfolio.js";
import { addCompleted } from "../utils.js";

export async function readPortfolioAgent(state) {
  const portfolio = await readPortfolio(state.portfolioPath);
  const summary = summarizePortfolio(portfolio);

  return {
    portfolio,
    portfolioSummary: formatPortfolioSummary(summary),
    completed: addCompleted(state.completed, "read_portfolio_agent"),
  };
}
