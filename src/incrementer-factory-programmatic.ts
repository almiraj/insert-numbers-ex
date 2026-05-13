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
    const match = /^(.*?)~(.+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startSource, endSource] = match;
    const startParts = parseFormattedNumber(startSource);
    const endParts = parseFormattedNumber(endSource);
    if (!startParts || !endParts) {
      return undefined;
    }

    const { prefix, padding, digits, suffix } = startParts;
    const start = Number.parseInt(digits, 10);
    const end = Number.parseInt(endParts.digits, 10);
    const plusMinus = start <= end ? 1 : -1;
    const rangeLength = Math.abs(end - start) + 1;
    const format = createNumberFormatter(prefix, padding, digits, suffix);

    return (index: number) => {
      return format(start + (index % rangeLength) * plusMinus);
    };
  }

  /**
   * Creates a repeated numeric incrementer.
   * Supports patterns like `1*3`, which yields `1`, `1`, `1`, `2`, ...
   */
  static createRepeatedNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(.*?)\*(.+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startSource, repeatSource] = match;
    const startParts = parseFormattedNumber(startSource);
    const repeatParts = parseFormattedNumber(repeatSource);
    if (!startParts || !repeatParts) {
      return undefined;
    }

    const { prefix, padding, digits, suffix } = startParts;
    const repeat = Number.parseInt(repeatParts.digits, 10);
    if (repeat <= 0) {
      return undefined;
    }

    const start = Number.parseInt(digits, 10);
    const format = createNumberFormatter(prefix, padding, digits, suffix);
    const cycleLength = 3;

    return (index: number) => {
      return format(start + (Math.floor(index / repeat) % cycleLength));
    };
  }
}

type FormattedNumberParts = {
  prefix: string;
  padding: string;
  digits: string;
  suffix: string;
};

function parseFormattedNumber(source: string): FormattedNumberParts | undefined {
  const match = /^(.*?)( *)(\d+)(.*)$/u.exec(source);
  if (!match) {
    return undefined;
  }

  const [, prefix, padding, digits, suffix] = match;
  return { prefix, padding, digits, suffix };
}

function createNumberFormatter(prefix: string, padding: string, digits: string, suffix: string): (value: number) => string {
  const zeroPadded = digits.startsWith("0") && digits.length > 1;
  const width = zeroPadded ? digits.length : padding.length + digits.length;
  const padChar = zeroPadded ? "0" : " ";

  return (value: number) => {
    const formatted = String(value).padStart(width, padChar);
    return `${prefix}${formatted}${suffix}`;
  };
}
