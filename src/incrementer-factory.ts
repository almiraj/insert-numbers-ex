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
   * Creates a Japanese numeric incrementer.
   * Supports patterns like `０`, `１`, `１０` and `０１`.
   */
  static createJapaneseNumericIncrementer(source: string): Incrementer | undefined {
    const japaneseNumericDigits = "０１２３４５６７８９";

    const match = /^([^\d０-９]*)([０-９]+)(.*)$/u.exec(source);
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
