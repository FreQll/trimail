# ✂️ trimail

**Parse email threads and separate the real content from signatures, quotes, and reply chains.**

Trimail takes raw email content (HTML or plain text) and returns the actual message body — stripped of quoted replies, forwarded threads, signature blocks, and tracking pixels.

## Installation

```bash
npm install trimail
```

## Quick Start

```typescript
import { trimail } from "trimail";

// HTML email (default)
const result = trimail(emailHtmlContent);

console.log(result.body); // Clean email body
console.log(result.signature); // Stripped content, or null
```

## API

```typescript
trimail(content: string, options?: TrimailOptions): TrimailResult
```

| Parameter        | Type               | Default  | Description           |
| ---------------- | ------------------ | -------- | --------------------- |
| `content`        | `string`           | —        | The raw email content |
| `options.format` | `"html" \| "text"` | `"html"` | Input format          |

### Return Type

```typescript
interface TrimailResult {
  body: string; // The clean email content
  signature: string | null; // Stripped signatures, quotes, and replies
}
```

## Usage

### HTML Emails

```typescript
import { trimail } from "trimail";

const html = `
  <div>Sounds good, let's do it!</div>
  <div class="gmail_quote">
    <blockquote>Can we schedule a call for tomorrow?</blockquote>
  </div>
`;

const { body, signature } = trimail(html);
// body:      '<div>Sounds good, let\'s do it!</div>'
// signature: '<div class="gmail_quote">...</div>'
```

### Plain Text Emails

```typescript
const { body, signature } = trimail(
  `Got it, thanks!\n\nOn Mon, Jan 6 John wrote:\n> Original message`,
  { format: "text" }
);
// body:      'Got it, thanks!'
// signature: 'On Mon, Jan 6 John wrote:\n> Original message'
```

## 📧 Supported Email Clients

| Client                     | Quotes | Signatures |
| -------------------------- | :----: | :--------: |
| Gmail                      |   ✅   |     ✅     |
| Outlook (Desktop & Mobile) |   ✅   |     ✅     |
| Apple Mail                 |   ✅   |     ✅     |
| Proton Mail                |   ✅   |     ✅     |
| Shortwave                  |   —    |     ✅     |
| Front                      |   —    |     ✅     |

### Additionally Detected

- `--` signature delimiters (RFC 3676)
- Common sign-offs — _Regards_, _Thanks_, _Cheers_, _Sincerely_, etc.
- Forwarded message headers
- Inline `>` quoting
- Table-based corporate signatures (titles, disclaimers, phone numbers)
- Tracking pixels (1×0 / 0×1 images)

### 🌍 Multilingual Quote Headers

Trimail detects "On ... wrote:" reply headers in **8 languages**:

| Language   | Pattern               |
| ---------- | --------------------- |
| English    | On ... wrote:         |
| German     | Am ... schrieb:       |
| French     | Le ... a écrit:       |
| Spanish    | El ... escribió:      |
| Italian    | Il ... ha scritto:    |
| Portuguese | Em ... escreveu:      |
| Dutch      | Op ... schreef:       |
| Ukrainian  | ... написав/написала: |

## License

MIT
