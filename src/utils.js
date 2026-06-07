export function messageToText(message) {
  if (!message) return "";
  if (typeof message.text === "string") return message.text;
  if (typeof message.content === "string") return message.content;

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return JSON.stringify(part);
      })
      .join("\n");
  }

  return JSON.stringify(message.content ?? message);
}

export function extractUrls(value) {
  const matches = JSON.stringify(value).match(/https?:\/\/[^\s"'\\)\]}]+/g) ?? [];
  return [...new Set(matches.map((url) => url.replace(/[.,;:]+$/, "")))];
}

export function addCompleted(completed, agentName) {
  return [...new Set([...(completed ?? []), agentName])];
}
