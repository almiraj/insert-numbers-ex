import type { Incrementer } from "./incrementer";

/**
 * Creates incrementers for compact programmatic prompts.
 */
export class ProgrammaticIncrementerFactory {
  /**
   * Creates a repeated cycling numeric incrementer.
   * Supports patterns like `1*2~3`, which yields `1`, `1`, `2`, `2`, `3`, `3`, `1`, ...
   * Supports patterns like `[ 9]*2~[10]`, which yields `[ 9]`, `[ 9]`, `[10]`, `[10]`, `[ 9]`, ...
   */
  static createRepeatedCyclingNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(.*?)\*(.+?)~(.+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startSource, repeatSource, endSource] = match;
    if (/[~*]/u.test(repeatSource + endSource)) {
      return undefined;
    }

    const matchStartParts = /^(.*?)( *)(\d+)(.*)$/u.exec(startSource);
    if (!matchStartParts) {
      return undefined;
    }
    const [, prefix, padding, digits, suffix] = matchStartParts;
    if (/[~*]/u.test(prefix + suffix)) {
      return undefined;
    }

    const matchRepeatDigits = /\d+/u.exec(repeatSource);
    const repeat = matchRepeatDigits ? Number.parseInt(matchRepeatDigits[0], 10) : undefined;
    if (repeat === undefined || repeat <= 0) {
      return undefined;
    }

    const matchEndDigits = /\d+/u.exec(endSource);
    const end = matchEndDigits ? Number.parseInt(matchEndDigits[0], 10) : undefined;
    if (end === undefined) {
      return undefined;
    }

    const start = Number.parseInt(digits, 10);
    const plusMinus = start <= end ? 1 : -1;
    const rangeLength = Math.abs(end - start) + 1;
    const format = createNumberFormatter(prefix, padding, digits, suffix);

    return (index: number) => {
      return format(start + (Math.floor(index / repeat) % rangeLength) * plusMinus);
    };
  }

  /**
   * Creates a cycling numeric incrementer.
   * Supports patterns like `1~3`, which yields `1`, `2`, `3`, `1`, ...
   * Supports patterns like `[ 8]~10`, which yields `[ 8]`, `[ 9]`, `[10]`, `[ 8]`, ...
   * Supports descending ranges like `3~1`, which yields `3`, `2`, `1`, `3`, ...
   */
  static createCyclingNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(.*?)~(.+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startSource, endSource] = match;
    if (/[~*]/u.test(endSource)) {
      return undefined;
    }

    const matchStartParts = /^(.*?)( *)(\d+)(.*)$/u.exec(startSource);
    if (!matchStartParts) {
      return undefined;
    }
    const [, prefix, padding, digits, suffix] = matchStartParts;
    if (/[~*]/u.test(prefix + suffix)) {
      return undefined;
    }

    const matchEndDigits = /\d+/u.exec(endSource);
    const end = matchEndDigits ? Number.parseInt(matchEndDigits[0], 10) : undefined;
    if (end === undefined) {
      return undefined;
    }

    const start = Number.parseInt(digits, 10);
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
   * Supports patterns like `[ 9]*2`, which yields `[ 9]`, `[ 9]`, `[10]`, `[10]`, `[11]`, `[11]`, ...
   */
  static createRepeatedNumericIncrementer(source: string): Incrementer | undefined {
    const match = /^(.*?)\*(.+)$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, startSource, repeatSource] = match;
    if (/[~*]/u.test(repeatSource)) {
      return undefined;
    }

    const matchStartParts = /^(.*?)( *)(\d+)(.*)$/u.exec(startSource);
    if (!matchStartParts) {
      return undefined;
    }
    const [, prefix, padding, digits, suffix] = matchStartParts;
    if (/[~*]/u.test(prefix + suffix)) {
      return undefined;
    }
    const matchRepeatDigits = /\d+/u.exec(repeatSource);
    const repeat = matchRepeatDigits ? Number.parseInt(matchRepeatDigits[0], 10) : undefined;
    if (repeat === undefined || repeat <= 0) {
      return undefined;
    }

    const start = Number.parseInt(digits, 10);
    const format = createNumberFormatter(prefix, padding, digits, suffix);

    return (index: number) => {
      return format(start + Math.floor(index / repeat));
    };
  }
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
