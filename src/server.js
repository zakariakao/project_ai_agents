import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { runPortfolioAnalysis } from "./analysis.js";
import { getApiKeyStatus, getConfig } from "./config.js";
import { PortfolioSchema } from "./portfolio.js";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_FILES = new Map([
  ["/", "public/index.html"],
]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
const AnalyzeRequestSchema = z.object({
  query: z.string().trim().min(3).max(2000),
  portfolio: PortfolioSchema,
});

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must contain valid JSON.");
  }
}

async function servePublicFile(response, filePath) {
  const absolutePath = resolve(filePath);
  const content = await readFile(absolutePath);
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(absolutePath)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  response.end(content);
}

export function createAppServer({ analyzePortfolio = runPortfolioAnalysis } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || HOST}`);

      if (request.method === "GET" && PUBLIC_FILES.has(url.pathname)) {
        await servePublicFile(response, PUBLIC_FILES.get(url.pathname));
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/status") {
        sendJson(response, 200, {
          keys: getApiKeyStatus(),
          model: getConfig().openAiModel,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/analyze") {
        const body = AnalyzeRequestSchema.parse(await readJsonBody(request));
        const reportId = randomUUID();
        const outputPath = `reports/web-report-${reportId}.md`;
        const result = await analyzePortfolio({
          query: body.query,
          portfolioInput: body.portfolio,
          outputPath,
        });

        sendJson(response, 200, {
          report: result.report,
          portfolioSummary: result.portfolioSummary,
          marketResearch: result.marketResearch,
          references: result.references,
          completed: result.completed,
          outputPath,
        });
        return;
      }

      sendJson(response, 404, { error: "Not found." });
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? z.prettifyError(error)
          : error.message || "Unexpected server error.";
      sendJson(response, 400, { error: message });
    }
  });
}

function startServer() {
  const server = createAppServer();
  server.listen(PORT, HOST, () => {
    console.log(`Portfolio Agent web interface: http://${HOST}:${PORT}`);
  });
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  startServer();
}
