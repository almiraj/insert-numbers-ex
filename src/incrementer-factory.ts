import type { Incrementer } from "./incrementer";

/**
 * Creates incrementers for numbers, characters, and fallback values.
 */
export default class IncrementerFactory {
  /**
   * Creates a numeric incrementer.
   * Supports patterns like `1`, `1_`, `[1]`, and `01`.
   */
  static createNumericIncrementer(source: string): Incrementer | undefined {
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
   * Creates an incrementer for prefixed radix numbers.
   * Supports patterns like `0b01`, `0o07`, `0x0f`, and `0x0F`.
   */
  static createPrefixedRadixIncrementer(source: string): Incrementer | undefined {
    const match = /^(.*?)(0[bB][01]+|0[oO][0-7]+|0[xX][0-9a-fA-F]+)(.*)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, prefix, prefixedDigits, suffix] = match;
    const numberPrefix = prefixedDigits.slice(0, 2);
    const digits = prefixedDigits.slice(2);
    const lowerPrefix = numberPrefix.toLowerCase();
    let radix: number;
    if (lowerPrefix === "0b") {
      radix = 2;
    } else if (lowerPrefix === "0o") {
      radix = 8;
    } else if (lowerPrefix === "0x") {
      radix = 16;
    } else {
      return undefined;
    }
    const width = digits.length;
    const padded = digits.startsWith("0") && width > 1;
    const start = Number.parseInt(digits, radix);
    const isUpperCase = radix === 16 && (numberPrefix === "0X" || /[A-F]/u.test(digits));

    return (index: number) => {
      const rawValue = (start + index).toString(radix);
      const value = isUpperCase ? rawValue.toUpperCase() : rawValue;
      const formatted = padded ? value.padStart(width, "0") : value;
      return `${prefix}${numberPrefix}${formatted}${suffix}`;
    };
  }

  /**
   * Creates a space-padded numeric incrementer.
   * Supports patterns like ` 8` and `[ 8]`.
   */
  static createSpacePaddedNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(.*?)( +)(\d+)(.*)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, prefix, padding, digits, suffix] = match;
    if (/\d/u.test(prefix)) {
      return undefined;
    }

    const start = Number.parseInt(digits, 10);
    const width = padding.length + digits.length;

    return (index: number) => {
      const formatted = String(start + index).padStart(width, " ");
      return `${prefix}${formatted}${suffix}`;
    };
  }

  /**
   * Creates a Japanese numeric incrementer.
   * Supports patterns like `０`, `１`, `【１】`, `１０` and `０１`.
   * Returns `undefined` when `0-9` appears before supported `０-９`.
   */
  static createJapaneseNumericIncrementer(source: string): Incrementer | undefined {
    const japaneseNumericDigits = "０１２３４５６７８９";

    const match = /^([^０-９]*)([０-９]+)(.*)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, prefix, jaDigits, suffix] = match;
    if (/\d/u.test(prefix)) {
      return undefined;
    }

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
   * Returns `undefined` when `0-9` or `０-９` appears before a supported character.
   */
  static createCharacterIncrementer(source: string): Incrementer | undefined {
    const charMemberSets = [
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

    let sourceOffset = 0;
    for (const char of [...source]) {
      if (/[\d０-９]/u.test(char)) {
        return undefined;
      }

      for (const charMemberSet of charMemberSets) {
        const charMembers = [...charMemberSet];
        const startIdx = charMembers.indexOf(char);
        if (startIdx >= 0) {
          const prefix = source.slice(0, sourceOffset);
          const suffix = source.slice(sourceOffset + char.length);
          return (index: number) => `${prefix}${charMembers[(startIdx + index) % charMembers.length]}${suffix}`;
        }
      }

      sourceOffset += char.length;
    }

    return undefined;
  }

  /**
   * Creates an incrementer that simply repeats the source text (fallback).
   */
  static createOnlyRepeatFormatter(source: string): Incrementer | undefined {
    if (source.length === 0) {
      return undefined;
    }

    return (_index: number) => source;
  }
}
