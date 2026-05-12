import type { Incrementer } from "./incrementer";

/**
 * Creates incrementers for compact programmatic prompts.
 */
export class ProgrammaticIncrementerFactory {
  /**
   * Creates a cycling numeric incrementer.
   * Supports patterns like `1~3`, which yields `1`, `2`, `3`, `1`, ...
   */
  static createCyclingNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d+)~(\d+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startText, countText] = match;
    const count = Number.parseInt(countText, 10);
    if (count <= 0) {
      return undefined;
    }

    const start = Number.parseInt(startText, 10);
    const width = startText.length;
    const padded = startText.startsWith("0") && width > 1;

    return (index: number) => {
      const value = String(start + (index % count));
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
