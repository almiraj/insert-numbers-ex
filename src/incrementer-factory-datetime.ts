import type { Incrementer } from "./incrementer";

/**
 * Creates date and time incrementers.
 */
export default class DatetimeIncrementerFactory {
  /**
   * Creates a month-name incrementer.
   * Supports patterns like `Nov`, `November`, `nov` and `NOV`.
   */
  static createMonthNameIncrementer(source: string): Incrementer | undefined {
    const month = parseMonthName(source);
    if (!month) {
      return undefined;
    }

    const start = new Date(Date.UTC(1970, month.index, 1));
    return (index: number) => formatMonthName(addMonths(start, index).getUTCMonth(), month);
  }

  /**
   * Creates a month-name-year incrementer.
   * Supports patterns like `Nov/2026`, `Nov 2026`, `2026/Nov` and `2026 Nov`.
   */
  static createMonthNameYearIncrementer(source: string): Incrementer | undefined {
    const monthFirst = new RegExp(`^(${MONTH_NAME_PATTERN})([\\/-]|\\s+)(\\d{4})$`, "u").exec(source);
    if (monthFirst) {
      const [, monthText, separatorText, yearText] = monthFirst;
      const month = parseMonthName(monthText);
      const year = Number(yearText);
      if (!month || year < 1970) {
        return undefined;
      }

      const start = new Date(Date.UTC(year, month.index, 1));
      return (index: number) => {
        const incrementedDate = addMonths(start, index);
        return [
          formatMonthName(incrementedDate.getUTCMonth(), month),
          String(incrementedDate.getUTCFullYear()).padStart(yearText.length, "0")
        ].join(separatorText);
      };
    }

    const yearFirst = new RegExp(`^(\\d{4})([\\/-]|\\s+)(${MONTH_NAME_PATTERN})$`, "u").exec(source);
    if (!yearFirst) {
      return undefined;
    }

    const [, yearText, separatorText, monthText] = yearFirst;
    const month = parseMonthName(monthText);
    const year = Number(yearText);
    if (!month || year < 1970) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month.index, 1));
    return (index: number) => {
      const incrementedDate = addMonths(start, index);
      return [
        String(incrementedDate.getUTCFullYear()).padStart(yearText.length, "0"),
        formatMonthName(incrementedDate.getUTCMonth(), month)
      ].join(separatorText);
    };
  }

  /**
   * Creates a month-name-day incrementer.
   * Supports patterns like `Nov 30`, `Nov-30`, `30 Nov` and `30-Nov`.
   */
  static createMonthNameDayIncrementer(source: string): Incrementer | undefined {
    const monthFirst = new RegExp(`^(${MONTH_NAME_PATTERN})([\\/-]|\\s+)(\\d{1,2})$`, "u").exec(source);
    if (monthFirst) {
      const [, monthText, separatorText, dayText] = monthFirst;
      return createMonthNameDayIncrementer(monthText, dayText, (date, month) =>
        [formatMonthName(date.getUTCMonth(), month), String(date.getUTCDate())].join(separatorText)
      );
    }

    const dayFirst = new RegExp(`^(\\d{1,2})([\\/-]|\\s+)(${MONTH_NAME_PATTERN})$`, "u").exec(source);
    if (!dayFirst) {
      return undefined;
    }

    const [, dayText, separatorText, monthText] = dayFirst;
    return createMonthNameDayIncrementer(monthText, dayText, (date, month) =>
      [String(date.getUTCDate()), formatMonthName(date.getUTCMonth(), month)].join(separatorText)
    );
  }

  /**
   * Creates a month-name date incrementer.
   * Supports patterns like `Nov 30, 2026`, `Nov 30 2026`, `30 Nov 2026` and `2026 Nov 30`.
   */
  static createMonthNameDateIncrementer(source: string): Incrementer | undefined {
    const monthDayYear = new RegExp(`^(${MONTH_NAME_PATTERN})([\\/-]|\\s+)(\\d{1,2})(,?\\s+|[\\/-])(\\d{4})$`, "u").exec(
      source
    );
    if (monthDayYear) {
      const [, monthText, firstSeparator, dayText, secondSeparator, yearText] = monthDayYear;
      return createMonthNameDateIncrementer(monthText, dayText, yearText, (date, month) =>
        joinThree(
          formatMonthName(date.getUTCMonth(), month),
          firstSeparator,
          String(date.getUTCDate()),
          secondSeparator,
          String(date.getUTCFullYear()).padStart(yearText.length, "0")
        )
      );
    }

    const dayMonthYear = new RegExp(`^(\\d{1,2})([\\/-]|\\s+)(${MONTH_NAME_PATTERN})([\\/-]|\\s+)(\\d{4})$`, "u").exec(
      source
    );
    if (dayMonthYear) {
      const [, dayText, firstSeparator, monthText, secondSeparator, yearText] = dayMonthYear;
      return createMonthNameDateIncrementer(monthText, dayText, yearText, (date, month) =>
        joinThree(
          String(date.getUTCDate()),
          firstSeparator,
          formatMonthName(date.getUTCMonth(), month),
          secondSeparator,
          String(date.getUTCFullYear()).padStart(yearText.length, "0")
        )
      );
    }

    const yearMonthDay = new RegExp(`^(\\d{4})([\\/-]|\\s+)(${MONTH_NAME_PATTERN})([\\/-]|\\s+)(\\d{1,2})$`, "u").exec(
      source
    );
    if (!yearMonthDay) {
      return undefined;
    }

    const [, yearText, firstSeparator, monthText, secondSeparator, dayText] = yearMonthDay;
    return createMonthNameDateIncrementer(monthText, dayText, yearText, (date, month) =>
      joinThree(
        String(date.getUTCFullYear()).padStart(yearText.length, "0"),
        firstSeparator,
        formatMonthName(date.getUTCMonth(), month),
        secondSeparator,
        String(date.getUTCDate())
      )
    );
  }

  /**
   * Creates a date-time incrementer.
   * Supports patterns like `2026/12/31 23:59:58` and `2026-12-31 23:59:58`.
   */
  static createFullDateTimeIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{4})([\/-])(\d{1,2})\2(\d{1,2})(\s+)(\d{1,2}):(\d{1,2}):(\d{1,2})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, yearText, separatorText, monthText, dayText, spacer, hourText, minuteText, secondText] = match;
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
      const incrementedDate = new Date(start + index * 1000);
      const dateText = [
        String(incrementedDate.getUTCFullYear()).padStart(yearText.length, "0"),
        String(incrementedDate.getUTCMonth() + 1).padStart(monthText.length, "0"),
        String(incrementedDate.getUTCDate()).padStart(dayText.length, "0")
      ].join(separatorText);
      const timeText = [
        String(incrementedDate.getUTCHours()).padStart(hourText.length, "0"),
        String(incrementedDate.getUTCMinutes()).padStart(minuteText.length, "0"),
        String(incrementedDate.getUTCSeconds()).padStart(secondText.length, "0")
      ].join(":");
      return dateText + spacer + timeText;
    };
  }

  /**
   * Creates a year-month-day incrementer.
   * Supports patterns like `2026/04/29`, `2026-04-29`, `2026/4/29` and `2026-4-29`.
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
    const monthPaddingWidth = getDatePartPaddingWidth(monthText);
    const dayPaddingWidth = getDatePartPaddingWidth(dayText, monthText);
    return (index: number) => {
      const incrementedDate = addDays(start, index);
      return [
        String(incrementedDate.getUTCFullYear()).padStart(yearText.length, "0"),
        String(incrementedDate.getUTCMonth() + 1).padStart(monthPaddingWidth, "0"),
        String(incrementedDate.getUTCDate()).padStart(dayPaddingWidth, "0")
      ].join(separatorText);
    };
  }

  /**
   * Creates a month-day-year incrementer.
   * Supports patterns like `04/29/2026`, `04-29-2026`, `4/29/2026` and `4-29-2026`.
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
    const monthPaddingWidth = getDatePartPaddingWidth(monthText);
    const dayPaddingWidth = getDatePartPaddingWidth(dayText, monthText);
    return (index: number) => {
      const incrementedDate = addDays(start, index);
      return [
        String(incrementedDate.getUTCMonth() + 1).padStart(monthPaddingWidth, "0"),
        String(incrementedDate.getUTCDate()).padStart(dayPaddingWidth, "0"),
        String(incrementedDate.getUTCFullYear()).padStart(yearText.length, "0")
      ].join(separatorText);
    };
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
    const monthPaddingWidth = getDatePartPaddingWidth(monthText);
    const dayPaddingWidth = getDatePartPaddingWidth(dayText, monthText);
    return (index: number) => {
      const incrementedDate = addDays(start, index);
      return [
        String(incrementedDate.getUTCMonth() + 1).padStart(monthPaddingWidth, "0"),
        String(incrementedDate.getUTCDate()).padStart(dayPaddingWidth, "0")
      ].join(separatorText);
    };
  }

  /**
   * Creates a year-month incrementer.
   * Supports patterns like `2026/04`, `2026-04`, `2026/4` and `2026-4`.
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
    const monthPaddingWidth = getDatePartPaddingWidth(monthText);
    return (index: number) => {
      const incrementedDate = addMonths(start, index);
      return [
        String(incrementedDate.getUTCFullYear()).padStart(yearText.length, "0"),
        String(incrementedDate.getUTCMonth() + 1).padStart(monthPaddingWidth, "0")
      ].join(separatorText);
    };
  }

  /**
   * Creates a month-year incrementer.
   * Supports patterns like `04/2026`, `04-2026`, `4/2026` and `4-2026`.
   */
  static createMyIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{1,2})([\/-])(\d{4})$/u.exec(source);
    if (!match) {
      return undefined;
    }

    const [, monthText, separatorText, yearText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    if (year < 1970 || month < 1 || month > 12) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const monthPaddingWidth = getDatePartPaddingWidth(monthText);
    return (index: number) => {
      const incrementedDate = addMonths(start, index);
      return [
        String(incrementedDate.getUTCMonth() + 1).padStart(monthPaddingWidth, "0"),
        String(incrementedDate.getUTCFullYear()).padStart(yearText.length, "0")
      ].join(separatorText);
    };
  }

  /**
   * Creates a time incrementer with seconds.
   * Supports patterns like `23:59:58`.
   * Does not support patterns like `1:59:58` or `23:59:1`.
   */
  static createTimeWithSecondIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{2}):(\d{2}):(\d{2})$/u.exec(source);
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
    return (index: number) => {
      const incrementedDate = addSeconds(start, index);
      return [
        String(incrementedDate.getUTCHours()).padStart(hourText.length, "0"),
        String(incrementedDate.getUTCMinutes()).padStart(minuteText.length, "0"),
        String(incrementedDate.getUTCSeconds()).padStart(secondText.length, "0")
      ].join(":");
    };
  }

  /**
   * Creates a time incrementer without seconds.
   * Supports patterns like `1:58` and `23:58`.
   * Does not support patterns like `1:1` or `23:1`.
   */
  static createTimeWithoutSecondIncrementer(source: string): Incrementer | undefined {
    const match = /^(\d{1,2}):(\d{2})$/u.exec(source);
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
    return (index: number) => {
      const incrementedDate = addMinutes(start, index);
      return [
        String(incrementedDate.getUTCHours()).padStart(hourText.length, "0"),
        String(incrementedDate.getUTCMinutes()).padStart(minuteText.length, "0")
      ].join(":");
    };
  }
}

const MONTHS = [
  ["Jan", "January"],
  ["Feb", "February"],
  ["Mar", "March"],
  ["Apr", "April"],
  ["May", "May"],
  ["Jun", "June"],
  ["Jul", "July"],
  ["Aug", "August"],
  ["Sep", "September"],
  ["Oct", "October"],
  ["Nov", "November"],
  ["Dec", "December"]
] as const;

const MONTH_NAME_PATTERN =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

type MonthNameStyle = {
  index: number;
  length: "short" | "long" | "sept";
  case: "lower" | "upper" | "title";
};

function parseMonthName(source: string): MonthNameStyle | undefined {
  const normalized = source.toLowerCase();
  for (let index = 0; index < MONTHS.length; index += 1) {
    const [shortName, longName] = MONTHS[index];
    const lowerShortName = shortName.toLowerCase();
    const lowerLongName = longName.toLowerCase();
    if (shortName === "Sep" && normalized === "sept") {
      return { index, length: "sept", case: getMonthNameCase(source) };
    }

    if (normalized === lowerShortName) {
      return { index, length: "short", case: getMonthNameCase(source) };
    }

    if (normalized === lowerLongName) {
      return { index, length: "long", case: getMonthNameCase(source) };
    }
  }

  return undefined;
}

function formatMonthName(monthIndex: number, style: MonthNameStyle): string {
  const monthName = style.length === "sept" && monthIndex === 8 ? "Sept" : MONTHS[monthIndex][style.length === "long" ? 1 : 0];
  if (style.case === "lower") {
    return monthName.toLowerCase();
  }

  if (style.case === "upper") {
    return monthName.toUpperCase();
  }

  return monthName;
}

function getMonthNameCase(source: string): MonthNameStyle["case"] {
  if (source === source.toLowerCase()) {
    return "lower";
  }

  if (source === source.toUpperCase()) {
    return "upper";
  }

  return "title";
}

function createMonthNameDayIncrementer(
  monthText: string,
  dayText: string,
  format: (date: Date, month: MonthNameStyle) => string
): Incrementer | undefined {
  const month = parseMonthName(monthText);
  const day = Number(dayText);
  if (!month || !isValidMonthDay(month.index + 1, day)) {
    return undefined;
  }

  const start = new Date(Date.UTC(1970, month.index, day));
  return (index: number) => format(addDays(start, index), month);
}

function createMonthNameDateIncrementer(
  monthText: string,
  dayText: string,
  yearText: string,
  format: (date: Date, month: MonthNameStyle) => string
): Incrementer | undefined {
  const month = parseMonthName(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  if (!month || !isValidDate(year, month.index + 1, day)) {
    return undefined;
  }

  const start = new Date(Date.UTC(year, month.index, day));
  return (index: number) => format(addDays(start, index), month);
}

function joinThree(first: string, firstSeparator: string, second: string, secondSeparator: string, third: string): string {
  return `${first}${firstSeparator}${second}${secondSeparator}${third}`;
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

function isValidTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

function isValidDateTimeTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

function getDatePartPaddingWidth(part: string, relatedPart?: string): number {
  if (part.startsWith("0") || relatedPart?.startsWith("0") || (relatedPart === undefined && part.length > 1)) {
    return part.length;
  }

  if (relatedPart !== undefined && relatedPart.length > 1) {
    return part.length;
  }

  return 1;
}
