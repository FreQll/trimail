import type { TrimailResult } from "./index.js";

// Multilingual "On ... wrote:" quote header patterns
const QUOTE_HEADER_PATTERN =
  /^(on .+ wrote|am .+ schrieb|le .+ a? ?écrit|el .+ escribió|il .+ (?:ha )?scritto|em .+ escreveu|op .+ schreef|.+ написав|.+ написала).{0,100}:?\s*$/i;

const SIGNATURE_PREFIXES =
  /^(regards|best regards|thanks|thank you|cheers|sincerely|sent from my|get outlook for)/i;

const FORWARDED_MESSAGE =
  /^-{2,} ?(original message|forwarded message|mensaje reenviado|weitergeleitete nachricht|message transféré)/i;

export function parseText(content: string): TrimailResult {
  const lines = content.split(/\r?\n/);

  let signatureIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    // Standard signature delimiter (RFC 3676)
    if (line === "-- " || line === "--") {
      signatureIndex = i;
      break;
    }

    // Dash-line separators (10+ dashes)
    if (/^[- ]{10,}$/.test(line)) {
      signatureIndex = i;
      break;
    }

    // Common signature prefixes
    if (SIGNATURE_PREFIXES.test(line)) {
      signatureIndex = i;
      break;
    }

    // Multilingual quoted reply headers
    if (QUOTE_HEADER_PATTERN.test(line)) {
      signatureIndex = i;
      break;
    }

    // Forwarded / original message markers
    if (FORWARDED_MESSAGE.test(line)) {
      signatureIndex = i;
      break;
    }

    // Inline quoting
    if (line.startsWith(">")) {
      signatureIndex = i;
      break;
    }
  }

  if (signatureIndex === -1) {
    return { body: content.trim(), signature: null };
  }

  const body = lines.slice(0, signatureIndex).join("\n").trim();
  const signature = lines.slice(signatureIndex).join("\n").trim();

  return { body, signature: signature || null };
}
