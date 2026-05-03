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
  static createCharacterIncrementer(source: string): Incrementer | undefined {
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

    let position = 0;
    for (const character of [...source]) {
      if (/[\d０-９]/u.test(character)) {
        return undefined;
      }

      for (const set of characterSets) {
        const members = [...set];
        const startIndex = members.indexOf(character);
        if (startIndex >= 0) {
          const suffix = source.slice(position + character.length);
          const prefix = source.slice(0, position);
          return (index: number) => `${prefix}${members[(startIndex + index) % members.length]}${suffix}`;
        }
      }
      position += character.length;
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
