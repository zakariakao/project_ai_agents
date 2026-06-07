import "dotenv/config";

export function getConfig() {
  return {
    openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  };
}

export function assertApiKeys() {
  const missing = ["OPENAI_API_KEY", "TAVILY_API_KEY"].filter(
    (name) => !process.env[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Copy .env.example to .env and add your API keys.",
    );
  }
}
