import type { Incrementer } from "./incrementer";

/**
 * Creates incrementers for compact programmatic prompts.
 */
export class ProgrammaticIncrementerFactory {
  /**
   * Creates a cycling numeric incrementer.
   * Supports patterns like `1~3`, which yields `1`, `2`, `3`, `1`, ...
   * Supports descending ranges like `3~1`, which yields `3`, `2`, `1`, `3`, ...
   */
  static createCyclingNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d+)~(\d+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startText, endText] = match;
    const start = Number.parseInt(startText, 10);
    const end = Number.parseInt(endText, 10);
    const plusMinus = start <= end ? 1 : -1;
    const rangeLength = Math.abs(end - start) + 1;
    const width = Math.max(startText.length, endText.length);
    const padded = (startText.startsWith("0") && startText.length > 1) || (endText.startsWith("0") && endText.length > 1);

    return (index: number) => {
      const value = String(start + (index % rangeLength) * plusMinus);
      return padded ? value.padStart(width, "0") : value;
    };
  }

  /**
   * Creates a repeated numeric incrementer.
   * Supports patterns like `1*3`, which yields `1`, `1`, `1`, `2`, ...
   */
  static createRepeatedNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d+)\*(\d+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startText, repeatText] = match;
    const repeat = Number.parseInt(repeatText, 10);
    if (repeat <= 0) {
      return undefined;
    }

    const start = Number.parseInt(startText, 10);
    const width = startText.length;
    const padded = startText.startsWith("0") && width > 1;

    return (index: number) => {
      const value = String(start + Math.floor(index / repeat));
      return padded ? value.padStart(width, "0") : value;
    };
  }
}
