import { parseHtml } from "./html.js";
import { parseText } from "./text.js";

export interface TrimailOptions {
  format?: "html" | "text";
}

export interface TrimailResult {
  body: string;
  signature: string | null;
}

export function trimail(content: string, options?: TrimailOptions): TrimailResult {
  const format = options?.format ?? "html";

  if (format === "text") {
    return parseText(content);
  }

  return parseHtml(content);
}
