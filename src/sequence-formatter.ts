import { createDateTimeSequenceFormatter, createDateSequenceFormatter, createTimeSequenceFormatter } from "./datetime-sequence-formatter";

export type SequenceFormatter = (index: number) => string;

export function detectSequenceFormatter(source: string): SequenceFormatter | undefined {
  return (
    createDateTimeSequenceFormatter(source) ??
    createDateSequenceFormatter(source) ??
    createTimeSequenceFormatter(source) ??
    createNumericSequenceFormatter(source) ??
    createJapaneseNumericSequenceFormatter(source) ??
    createCharacterSequenceFormatter(source) ??
    createOnlyRepeatFormatter(source)
  );
}

/**
 * Creates a numeric sequence formatter.
 * Supports patterns like `1`, `1_`, `[1]`, and `01`.
 */
function createNumericSequenceFormatter(source: string): SequenceFormatter | undefined {
  const match = /^(.*?)(\d+)(.*)$/u.exec(source);
  if (!match) {
    return undefined;
  }

  const [, prefix, digits, suffix] = match;
  const start = Number.parseInt(digits, 10);
  const width = digits.length;
  const padded = digits.startsWith("0") && width > 1;

  return (index: number) => {
    const value = String(start + index);
    const formatted = padded ? value.padStart(width, "0") : value;
    return `${prefix}${formatted}${suffix}`;
  };
}

/**
 * Creates a Japanese numeric sequence formatter.
 * Supports patterns like `０`, `１`, `１０` and `０１`.
 */
function createJapaneseNumericSequenceFormatter(source: string): SequenceFormatter | undefined {
  const japaneseNumericDigits = "０１２３４５６７８９";

  const match = /^(.*?)([０-９]+)(.*)$/u.exec(source);
  if (!match) {
    return undefined;
  }

  const [, prefix, jaDigits, suffix] = match;
  const digits = jaDigits.normalize("NFKC");

  const start = Number.parseInt(digits, 10);
  const width = digits.length;
  const padded = digits.startsWith("0") && width > 1;

  return (index: number) => {
    const value = String(start + index);
    const formatted = padded ? value.padStart(width, "0") : value;
    const jaFormatted = formatted.replace(/\d/g, digit => japaneseNumericDigits[Number(digit)]);
    return `${prefix}${jaFormatted}${suffix}`;
  };
}

/**
 * Creates a character sequence formatter.
 * Supports patterns like ①, Ⅰ, `(a)` and `ア`.
 */
function createCharacterSequenceFormatter(source: string): SequenceFormatter | undefined {
  const characterSets = [
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ",
    "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ",
    "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚",
    "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ",
    "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん",
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
    "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ"
  ];

  for (const set of characterSets) {
    const members = [...set];
    for (const [startIndex, member] of members.entries()) {
      const match = new RegExp(`^(.*?)${member}(.*)$`, "u").exec(source);
      if (match) {
        const [, prefix, suffix] = match;
        return (offset: number) => `${prefix}${members[(startIndex + offset) % members.length]}${suffix}`;
      }
    }
  }

  return undefined;
}

function createOnlyRepeatFormatter(source: string): SequenceFormatter | undefined {
  if (source.length === 0) {
    return undefined;
  }

  return () => source;
}
