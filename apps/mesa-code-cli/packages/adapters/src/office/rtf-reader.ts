// ============================================================
// OfficeDocumentAdapter — RTF reader
// ============================================================
// A small, dependency-free RTF reader. RTF is a brace-delimited control-word
// language, so a regex cannot reliably skip destinations (font tables, colour
// tables, embedded objects, revision marks) or honour `\*` ignorable groups.
// This walks the token stream instead: it tracks nested groups, skips
// destinations that carry no visible text, decodes `\uN` escapes, `\'hh`
// code-page bytes, and paragraph/line control words.

const PARAGRAPH_BREAK = /^(par|pard|sect|line)$/u;

/** Destinations whose contents never contribute visible document text. */
const SKIPPABLE_DESTINATIONS = new Set([
  "fonttbl",
  "colortbl",
  "datastore",
  "themedata",
  "stylesheet",
  "info",
  "pict",
  "object",
  "shppict",
  "nonshppict",
  "listtable",
  "listoverridetable",
  "rsidtbl",
  "generator",
  "filetbl",
  "xmlnstbl",
  "header",
  "footer",
  "headerl",
  "headerr",
  "headerf",
  "footerl",
  "footerr",
  "footerf",
  "footnote",
  "annotation",
  "fldinst",
]);

const CP1252_HIGH: Record<number, string> = {
  0x80: "\u20ac",
  0x82: "\u201a",
  0x83: "\u0192",
  0x84: "\u201e",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02c6",
  0x89: "\u2030",
  0x8a: "\u0160",
  0x8b: "\u2039",
  0x8c: "\u0152",
  0x8e: "\u017d",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201c",
  0x94: "\u201d",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02dc",
  0x99: "\u2122",
  0x9a: "\u0161",
  0x9b: "\u203a",
  0x9c: "\u0153",
  0x9e: "\u017e",
  0x9f: "\u0178",
};

/** Extract the visible plain text from an RTF buffer. */
export function extractRtfText(buffer: Buffer): string {
  const source = buffer.toString("latin1");
  const output: string[] = [];
  let index = 0;
  // Stack of booleans: true when the group is skipped (a non-text destination
  // or an ignorable `\*` group).
  const skipStack: boolean[] = [];
  let skipping = false;
  let unicodeSkip = 0;

  const pushChar = (char: string): void => {
    if (skipping || unicodeSkip > 0) return;
    output.push(char);
  };

  while (index < source.length) {
    const char = source[index]!;

    if (unicodeSkip > 0) {
      // `\uN` is followed by `uc` "fallback" bytes that must be dropped.
      if (char === "\\" || char === "{") {
        unicodeSkip = 0;
        continue;
      }
      unicodeSkip -= 1;
      index += 1;
      continue;
    }

    if (char === "{") {
      skipStack.push(skipping);
      index += 1;
      continue;
    }
    if (char === "}") {
      skipping = skipStack.pop() ?? false;
      index += 1;
      continue;
    }
    if (char !== "\\") {
      pushChar(char);
      index += 1;
      continue;
    }

    index += 1;
    const control = source[index];
    if (control === undefined) break;

    if (control === "\\" || control === "{" || control === "}") {
      pushChar(control);
      index += 1;
      continue;
    }
    if (control === "*") {
      // Ignorable destination: nothing inside contributes text.
      unicodeSkip = 0;
      skipping = true;
      index += 1;
      continue;
    }
    if (control === "'") {
      const hex = source.slice(index + 1, index + 3);
      index += 3;
      if (/^[0-9a-fA-F]{2}$/u.test(hex)) {
        pushChar(decodeCodePageByte(Number.parseInt(hex, 16)));
      }
      continue;
    }
    if (control === "~") {
      pushChar(" ");
      index += 1;
      continue;
    }
    if (control === "-") {
      index += 1;
      continue;
    }
    if (!/[a-zA-Z]/u.test(control)) {
      index += 1;
      continue;
    }

    const wordStart = index;
    while (index < source.length && /[a-zA-Z]/u.test(source[index]!)) index += 1;
    const word = source.slice(wordStart, index);
    let sign = "";
    if (source[index] === "-") {
      sign = "-";
      index += 1;
    }
    const numberStart = index;
    while (index < source.length && /[0-9]/u.test(source[index]!)) index += 1;
    const numberText = source.slice(numberStart, index);
    // A single trailing space is the control-word delimiter and is not text.
    if (source[index] === " ") index += 1;
    const parameter = numberText ? Number.parseInt(`${sign}${numberText}`, 10) : undefined;

    if (word === "u" && parameter !== undefined) {
      if (!skipping) {
        const codePoint = parameter < 0 ? parameter + 0x10000 : parameter;
        pushChar(safeFromCodePoint(codePoint));
      }
      unicodeSkip = 1;
      continue;
    }
    if (word === "uc" && parameter !== undefined) continue;
    if (PARAGRAPH_BREAK.test(word)) {
      pushChar("\n");
      continue;
    }
    if (word === "tab") {
      pushChar("\t");
      continue;
    }
    if (word === "bullet") {
      pushChar("\u2022 ");
      continue;
    }
    if (SKIPPABLE_DESTINATIONS.has(word)) {
      skipping = true;
      continue;
    }
    // All other control words are formatting and contribute no text.
  }

  return normalizeRtfText(output.join(""));
}

function decodeCodePageByte(byte: number): string {
  if (byte < 0x80) return String.fromCharCode(byte);
  return CP1252_HIGH[byte] ?? String.fromCharCode(byte);
}

function safeFromCodePoint(codePoint: number): string {
  if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return "";
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

function normalizeRtfText(text: string): string {
  return text
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/gu, " ").trim())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}
