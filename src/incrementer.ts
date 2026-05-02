import { createDateIncrementer, createDateTimeIncrementer, createTimeIncrementer } from "./datetime-incrementer";

export type Incrementer = (index: number) => string;

export function detectIncrementer(source: string): Incrementer | undefined {
  return (
    createDateTimeIncrementer(source) ??
    createDateIncrementer(source) ??
    createTimeIncrementer(source) ??
    createNumericIncrementer(source) ??
    createJapaneseNumericIncrementer(source) ??
    createCharacterIncrementer(source) ??
    createOnlyRepeatIncrementer(source)
  );
}

/**
 * Creates a numeric incrementer.
 * Supports patterns like `1`, `1_`, `[1]`, and `01`.
 */
function createNumericIncrementer(source: string): Incrementer | undefined {
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
 * Creates a Japanese numeric incrementer.
 * Supports patterns like `０`, `１`, `１０` and `０１`.
 */
function createJapaneseNumericIncrementer(source: string): Incrementer | undefined {
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
 * Creates a character incrementer.
 * Supports patterns like ①, Ⅰ, `(a)` and `ア`.
 */
function createCharacterIncrementer(source: string): Incrementer | undefined {
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

function createOnlyRepeatIncrementer(source: string): Incrementer | undefined {
  if (source.length === 0) {
    return undefined;
  }

  return (_index: number) => source;
}
