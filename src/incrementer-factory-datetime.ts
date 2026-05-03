import type { Incrementer } from "./incrementer";

type DateSeparator = "/" | "-";

/**
 * Creates date and time incrementers.
 */
export default class DatetimeIncrementerFactory {
  /**
   * Creates a date-time incrementer.
   * Supports patterns like `2026/12/31 23:59:58` and `2026-12-31 23:59:58`.
   */
  static createFullDateTimeIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{4})([\/-])(\d{1,2})\2(\d{1,2})(\s+)(\d{1,2}):(\d{1,2}):(\d{1,2})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, yearText, dateSeparatorText, monthText, dayText, separator, hourText, minuteText, secondText] = match;
    const dateSeparator = asDateSeparator(dateSeparatorText);
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);

    if (!isValidDate(year, month, day) || !isValidDateTimeTime(hour, minute, second)) {
      return undefined;
    }

    const start = Date.UTC(year, month - 1, day, hour, minute, second);
    return (index: number) => {
      const value = new Date(start + index * 1000);
      return (
        formatYmdDate(value, dateSeparator, yearText.length, monthText.length, dayText.length) +
        separator +
        formatTime(value, hourText.length, minuteText.length, secondText.length)
      );
    };
  }

  /**
   * Creates a year-month-day incrementer.
   * Supports patterns like `2026/04/29`, `2026-04-29` and `2026/4/29`.
   */
  static createYmdIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{4})([\/-])(\d{1,2})\2(\d{1,2})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, yearText, separatorText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!isValidDate(year, month, day)) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, day));
    const separator = asDateSeparator(separatorText);
    return (index: number) =>
      formatYmdDate(
        addDays(start, index),
        separator,
        yearText.length,
        getDatePartWidth(monthText),
        getDatePartWidth(dayText, monthText)
      );
  }

  /**
   * Creates a month-day-year incrementer.
   * Supports patterns like `04/29/2026`, `04-29-2026` and `4/29/2026`.
   */
  static createMdydIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{1,2})([\/-])(\d{1,2})\2(\d{4})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, monthText, separatorText, dayText, yearText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!isValidDate(year, month, day)) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, day));
    const separator = asDateSeparator(separatorText);
    return (index: number) =>
      formatMdyDate(
        addDays(start, index),
        separator,
        getDatePartWidth(monthText),
        getDatePartWidth(dayText, monthText),
        yearText.length
      );
  }

  /**
   * Creates a month-day incrementer.
   * Supports patterns like `04/29` and `4/29`.
   */
  static createMdIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{1,2})([\/-])(\d{1,2})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, monthText, separatorText, dayText] = match;
    const month = Number(monthText);
    const day = Number(dayText);
    if (!isValidMonthDay(month, day)) {
      return undefined;
    }

    const start = new Date(Date.UTC(1970, month - 1, day));
    const separator = asDateSeparator(separatorText);
    return (index: number) =>
      formatMdDate(
        addDays(start, index),
        separator,
        getDatePartWidth(monthText),
        getDatePartWidth(dayText, monthText)
      );
  }

  /**
   * Creates a year-month incrementer.
   * Supports patterns like `2026/04`, `2026-04` and `2026/4`.
   */
  static createYmIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{4})([\/-])(\d{1,2})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, yearText, separatorText, monthText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    if (year < 1970 || month < 1 || month > 12) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const separator = asDateSeparator(separatorText);
    return (index: number) =>
      formatYmDate(addMonths(start, index), separator, yearText.length, getDatePartWidth(monthText));
  }

  /**
   * Creates a time incrementer with seconds.
   * Supports patterns like `23:59:58`.
   */
  static createTimeWithSecondIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, hourText, minuteText, secondText] = match;
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    if (!isValidTime(hour, minute, second)) {
      return undefined;
    }

    const start = new Date(Date.UTC(1970, 0, 1, hour, minute, second));
    return (index: number) => formatTime(addSeconds(start, index), hourText.length, minuteText.length, secondText.length);
  }

  /**
   * Creates a time incrementer without seconds.
   * Supports patterns like `23:58`.
   */
  static createTimeWithoutSecondIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{1,2}):(\d{1,2})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, hourText, minuteText] = match;
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!isValidTime(hour, minute, 0)) {
      return undefined;
    }

    const start = new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
    return (index: number) => formatTime(addMinutes(start, index), hourText.length, minuteText.length);
  }
}

function addDays(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));
}

function addMonths(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function addMinutes(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 60 * 1000);
}

function addSeconds(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 1000);
}

function formatYmdDate(date: Date, separator: DateSeparator, yearWidth: number, monthWidth: number, dayWidth: number): string {
  return [
    String(date.getUTCFullYear()).padStart(yearWidth, "0"),
    String(date.getUTCMonth() + 1).padStart(monthWidth, "0"),
    String(date.getUTCDate()).padStart(dayWidth, "0")
  ].join(separator);
}

function formatMdyDate(date: Date, separator: DateSeparator, monthWidth: number, dayWidth: number, yearWidth: number): string {
  return [
    String(date.getUTCMonth() + 1).padStart(monthWidth, "0"),
    String(date.getUTCDate()).padStart(dayWidth, "0"),
    String(date.getUTCFullYear()).padStart(yearWidth, "0")
  ].join(separator);
}

function formatMdDate(date: Date, separator: DateSeparator, monthWidth: number, dayWidth: number): string {
  return [
    String(date.getUTCMonth() + 1).padStart(monthWidth, "0"),
    String(date.getUTCDate()).padStart(dayWidth, "0")
  ].join(separator);
}

function formatYmDate(date: Date, separator: DateSeparator, yearWidth: number, monthWidth: number): string {
  return (
    String(date.getUTCFullYear()).padStart(yearWidth, "0") +
    separator +
    String(date.getUTCMonth() + 1).padStart(monthWidth, "0")
  );
}

function formatTime(date: Date, hourWidth: number, minuteWidth: number, secondWidth?: number): string {
  const hour = String(date.getUTCHours()).padStart(hourWidth, "0");
  const minute = String(date.getUTCMinutes()).padStart(minuteWidth, "0");

  if (secondWidth !== undefined) {
    const second = String(date.getUTCSeconds()).padStart(secondWidth, "0");
    return `${hour}:${minute}:${second}`;
  }

  return `${hour}:${minute}`;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(1970, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function asDateSeparator(separator: string): DateSeparator {
  return separator === "-" ? "-" : "/";
}

function getDatePartWidth(part: string, relatedPart?: string): number {
  if (part.startsWith("0") || relatedPart?.startsWith("0") || (relatedPart === undefined && part.length > 1)) {
    return part.length;
  }

  if (relatedPart !== undefined && relatedPart.length > 1) {
    return part.length;
  }

  return 1;
}

function isValidTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

function isValidDateTimeTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}
