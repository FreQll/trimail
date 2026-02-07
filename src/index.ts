export interface TrimailResult {
  body: string;
  signature: string | null;
}

export function trimail(raw: string): TrimailResult {
  const lines = raw.split(/\r?\n/);

  let signatureIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    // Standard signature delimiter (RFC 3676)
    if (line === "-- " || line === "--") {
      signatureIndex = i;
      break;
    }

    // Common signature prefixes
    if (
      /^(regards|best regards|thanks|thank you|cheers|sincerely|sent from my)/i.test(line)
    ) {
      signatureIndex = i;
      break;
    }

    // Quoted reply markers
    if (
      /^(on .+ wrote:|-{2,} ?(original message|forwarded message)|from:\s+.+)/i.test(line)
    ) {
      signatureIndex = i;
      break;
    }

    // Line starts with ">" (inline quoting)
    if (line.startsWith(">")) {
      signatureIndex = i;
      break;
    }
  }

  if (signatureIndex === -1) {
    return { body: raw.trim(), signature: null };
  }

  const body = lines.slice(0, signatureIndex).join("\n").trim();
  const signature = lines.slice(signatureIndex).join("\n").trim();

  return { body, signature: signature || null };
}
