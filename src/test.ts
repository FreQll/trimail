import { trimail } from "./index.js";

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    console.log(`    expected: ${e}`);
    console.log(`    received: ${a}`);
    failed++;
  }
}

console.log("trimail()");

// Plain message with no signature or quotes
assert("plain message returns body only", trimail("Hello, how are you?"), {
  body: "Hello, how are you?",
  signature: null,
});

// RFC 3676 signature delimiter
assert("detects -- delimiter", trimail("Hello!\n\n--\nJohn Doe\nAcme Corp"), {
  body: "Hello!",
  signature: "--\nJohn Doe\nAcme Corp",
});

// Common sign-off
assert(
  "detects 'Best regards' sign-off",
  trimail("See you tomorrow.\n\nBest regards,\nAlice"),
  { body: "See you tomorrow.", signature: "Best regards,\nAlice" }
);

assert(
  "detects 'Thanks' sign-off",
  trimail("I'll send the report.\n\nThanks,\nBob"),
  { body: "I'll send the report.", signature: "Thanks,\nBob" }
);

assert(
  "detects 'Sent from my' marker",
  trimail("Quick update on the project.\n\nSent from my iPhone"),
  { body: "Quick update on the project.", signature: "Sent from my iPhone" }
);

// Quoted reply markers
assert(
  "detects 'On ... wrote:' quoted reply",
  trimail(
    "Sounds good!\n\nOn Mon, Jan 6 at 10:00 AM John <john@x.com> wrote:\n> Original message"
  ),
  {
    body: "Sounds good!",
    signature:
      "On Mon, Jan 6 at 10:00 AM John <john@x.com> wrote:\n> Original message",
  }
);

assert(
  "detects '--- Original Message ---'",
  trimail("Got it.\n\n--- Original Message ---\nFrom: someone"),
  { body: "Got it.", signature: "--- Original Message ---\nFrom: someone" }
);

assert(
  "detects '--- Forwarded Message ---'",
  trimail("FYI below.\n\n--- Forwarded Message ---\nSubject: hi"),
  { body: "FYI below.", signature: "--- Forwarded Message ---\nSubject: hi" }
);

// Inline quoting
assert(
  "detects '>' inline quotes",
  trimail(
    "My reply here.\n\n> Previous message line 1\n> Previous message line 2"
  ),
  {
    body: "My reply here.",
    signature: "> Previous message line 1\n> Previous message line 2",
  }
);

// Empty input
assert("empty string returns empty body, null signature", trimail(""), {
  body: "",
  signature: null,
});

// Multiline body with no signature
assert(
  "multiline body without signature",
  trimail("Line one.\nLine two.\nLine three."),
  { body: "Line one.\nLine two.\nLine three.", signature: null }
);

// Windows-style line endings
assert("handles \\r\\n line endings", trimail("Hello!\r\n\r\n--\r\nJohn"), {
  body: "Hello!",
  signature: "--\nJohn",
});

console.log(`\n${passed} passed, ${failed} failed`);
