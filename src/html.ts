import { parse } from "node-html-parser";
import type { TrimailResult } from "./index.js";

// CSS selectors for known quote/signature elements across email clients
const QUOTE_SELECTORS = [
  // Gmail
  ".gmail_quote",
  "[class$='gmail_quote']",
  ".gmail_signature_prefix",
  "[class$='gmail_signature_prefix']",
  ".gmail_signature",
  "[class$='gmail_signature']",

  // Outlook
  "#Signature",
  ".ms-outlook-mobile-signature",
  "#mail-editor-reference-message-container",

  // Apple Mail
  'blockquote[type="cite"]',
  ".x-apple-transform-wrapper",

  // Proton Mail
  ".protonmail_signature_block",
  ".protonmail_signature_block-empty",
  ".protonmail_quote",

  // Shortwave
  ".shortwave-signature",
  "#shortwave-signature",

  // Front
  "front-signature",
  "[class^='main-style-'] > .front-signature",

  // Generic / cross-client
  "[name='messageSignatureSection']",
  "[name='messageReplySection']",
  'div[data-email-history="true"]',
];

// Multilingual "On ... wrote:" pattern — prefix words that start quote headers
const QUOTE_HEADER_PATTERN = /^(?:On |Am |Le |El |Il |Em |Op )/i;

// Ukrainian quote headers don't have a consistent prefix word, so match verb only
const QUOTE_HEADER_UKRAINIAN = /(?:написав|написала)(?:\s+[^:]+)?:?\s*$/i;

const QUOTE_HEADER_VERB =
  /(?:wrote|schrieb|a? ?écrit|escribió|(?:ha )?scritto|escreveu|schreef|написав|написала)(?:\s+[^:]+)?:?\s*$/i;

function isSignatureTable(text: string): boolean {
  // Reject content that looks like actual email body (form submissions, data)
  if (
    /new submission|form submission|submitted|inquiry|request from/i.test(
      text
    ) ||
    /:\s*https?:\/\//i.test(text) ||
    /funding:|employees:|usecases?:|industry:|company:/i.test(text) ||
    (text.length > 500 && (text.match(/https?:\/\//g) || []).length >= 2)
  ) {
    return false;
  }

  return (
    /confidential|disclaimer|strictly forbidden|third party|written consent|no liability|accepts no liability/i.test(
      text
    ) ||
    (/\b(chief|ceo|cto|coo|cfo|director|manager|officer|president|vp|vice president|founder|co[-\u2011\u2013\u2014]?founder)\b/i.test(
      text
    ) &&
      text.length < 500) ||
    /©\s*\d{4}|all rights reserved/i.test(text) ||
    /\bvat\s+[a-z]{2}\s*\d|company\s+number\s+\d|registration\s+number/i.test(
      text
    ) ||
    (/\+\d{1,3}\s*\d{2,4}\s*\d{3,4}\s*\d{3,4}/i.test(text) && text.length < 400)
  );
}

export function parseHtml(content: string): TrimailResult {
  if (!content) return { body: "", signature: null };

  const root = parse(content);
  let stripped = "";

  // 1. Remove blockquotes with classes (treated as quoted reply content)
  const classedBlockquotes = root.querySelectorAll("blockquote[class]");
  if (classedBlockquotes.length > 0) {
    stripped += classedBlockquotes[0]?.toString() ?? "";
    classedBlockquotes.forEach((bq) => bq.remove());
  }

  // 2. Remove Apple Mail / plain blockquotes with "On ... wrote:" inside
  const plainBlockquotes = root.querySelectorAll("blockquote:not([class])");
  for (const bq of plainBlockquotes) {
    const text = bq.textContent?.trim() || "";
    if (QUOTE_HEADER_VERB.test(text)) {
      stripped += bq.toString();
      bq.remove();
    }
  }

  // 3. Detect standalone "On ... wrote:" headers not inside blockquotes
  const allElements = root.querySelectorAll("div, p, span");
  for (const el of Array.from(allElements)) {
    const text = el.textContent?.trim() || "";
    const isQuoteHeader =
      (QUOTE_HEADER_PATTERN.test(text) && QUOTE_HEADER_VERB.test(text)) ||
      QUOTE_HEADER_UKRAINIAN.test(text);
    if (isQuoteHeader && text.length < 500) {
      // Remove this element and everything after it
      let next = el.nextElementSibling;
      stripped += el.toString();
      el.remove();
      while (next) {
        stripped += next.toString();
        const sibling = next.nextElementSibling;
        next.remove();
        next = sibling;
      }
      break;
    }
  }

  // 4. Remove known quote/signature selectors
  for (const selector of QUOTE_SELECTORS) {
    const matches = root.querySelectorAll(selector);
    for (const el of matches) {
      stripped += el.toString();
      el.remove();
    }
  }

  // 5. Outlook #appendonsend — remove it and trailing divs/hrs
  const appendOnSend = root.querySelector("#appendonsend");
  if (appendOnSend) {
    let next = appendOnSend.nextElementSibling;
    while (next) {
      if (next.tagName === "DIV" || next.tagName === "HR") {
        stripped += next.toString();
        const current = next;
        next = next.nextElementSibling;
        current.remove();
      } else {
        next = next.nextElementSibling;
      }
    }
    stripped += appendOnSend.toString();
    appendOnSend.remove();
  }

  // 6. Outlook WordSection — remove empty divs
  const wordSection = root.querySelector("[class^='WordSection']");
  if (wordSection) {
    const divs = wordSection.querySelectorAll(":scope > div");
    for (const div of divs) {
      const hasContent =
        div.querySelectorAll("p, span, b, strong, i, ul, ol, li").length > 0;
      const text = div.textContent?.trim() || "";
      if (
        !hasContent ||
        text.length === 0 ||
        div.id === "mail-editor-reference-message-container" ||
        div.id === "appendonsend"
      ) {
        stripped += div.toString();
        div.remove();
      }
    }
  }

  // 7. Outlook mobile signature by ID — remove it and everything after
  const outlookMobileSig = root.querySelector("#ms-outlook-mobile-signature");
  if (outlookMobileSig) {
    let next = outlookMobileSig.nextElementSibling;
    stripped += outlookMobileSig.toString();
    outlookMobileSig.remove();
    while (next) {
      stripped += next.toString();
      const sibling = next.nextElementSibling;
      next.remove();
      next = sibling;
    }
  }

  // 8. Signature delimiters (-- or 10+ dashes) in block elements
  const blocks = root.querySelectorAll("p, div, span");
  for (const el of Array.from(blocks)) {
    const text = el.textContent?.trim() || "";
    if (/^[- ]{10,}$/.test(text) || /^--(\s|$)/.test(text)) {
      let next = el.nextElementSibling;
      stripped += el.toString();
      el.remove();
      while (next) {
        stripped += next.toString();
        const sibling = next.nextElementSibling;
        next.remove();
        next = sibling;
      }
      break;
    }
  }

  // 9. Table-based corporate signatures
  const tables = root.querySelectorAll("table");
  const topLevelTables = Array.from(tables).filter(
    (t) => !t.parentNode?.closest?.("table")
  );

  const signatureTables: typeof topLevelTables = [];

  // Check from the end
  for (let i = topLevelTables.length - 1; i >= 0; i--) {
    const table = topLevelTables[i];
    if (!table) continue;
    const text = table.textContent?.toLowerCase() || "";
    if (!isSignatureTable(text)) break;

    let contentAfter = "";
    let next = table.nextElementSibling;
    while (next) {
      const nested = next.querySelector?.("table");
      if (!nested || !signatureTables.includes(nested)) {
        contentAfter += next.textContent || "";
      }
      next = next.nextElementSibling;
    }
    if (contentAfter.trim().length < 100) {
      signatureTables.push(table);
    } else {
      break;
    }
  }

  signatureTables.reverse().forEach((t) => {
    stripped += t.toString();
    t.remove();
  });

  // 10. Remove tracking pixels (1x0 or 0x1 images)
  const images = root.querySelectorAll("img");
  for (const img of images) {
    const w = img.getAttribute("width");
    const h = img.getAttribute("height");
    if ((w === "1" && h === "0") || (h === "1" && w === "0")) {
      img.remove();
    }
  }

  // Clean up empty tags and trailing <br>
  const body = root
    .toString()
    .replace(/<div><\/div>|<p><\/p>|<div><br><\/div>/g, "")
    .replace(/<br>(?=(<[^<>]+?>)*$)/g, "")
    .trim();

  const signature = stripped.replace(/<div><\/div>|<p><\/p>/g, "").trim();

  return { body, signature: signature || null };
}
