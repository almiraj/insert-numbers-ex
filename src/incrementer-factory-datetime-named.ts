import type { Incrementer } from "./incrementer";

/**
 * Creates named date incrementers such as `Apr` and `November`.
 */
export default class DatetimeNamedIncrementerFactory {
  /**
   * Creates a named-month incrementer.
   * Supports patterns like `Nov`, `November`, `nov` and `NOV`.
   */
  static createNamedMonthIncrementer(source: string): Incrementer | undefined {
    const month = parseMonthName(source);
    if (!month) {
      return undefined;
    }

    const start = new Date(Date.UTC(1970, month.index, 1));
    return (index: number) => formatMonthName(addMonths(start, index).getUTCMonth(), month);
  }

  /**
   * Creates a named-month-year incrementer.
   * Supports patterns like `Nov/2026`, `Nov 2026`, `2026/Nov` and `2026 Nov`.
   */
  static createNamedMonthYearIncrementer(source: string): Incrementer | undefined {
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
   * Creates a named-month-day incrementer.
   * Supports patterns like `Nov 30`, `Nov-30`, `30 Nov` and `30-Nov`.
   */
  static createNamedMonthDayIncrementer(source: string): Incrementer | undefined {
    const monthFirst = new RegExp(`^(${MONTH_NAME_PATTERN})([\\/-]|\\s+)(\\d{1,2})$`, "u").exec(source);
    if (monthFirst) {
      const [, monthText, separatorText, dayText] = monthFirst;
      return createNamedMonthDayIncrementer(monthText, dayText, (date, month, dayPaddingWidth) =>
        [formatMonthName(date.getUTCMonth(), month), formatDay(date, dayPaddingWidth)].join(separatorText)
      );
    }

    const dayFirst = new RegExp(`^(\\d{1,2})([\\/-]|\\s+)(${MONTH_NAME_PATTERN})$`, "u").exec(source);
    if (!dayFirst) {
      return undefined;
    }

    const [, dayText, separatorText, monthText] = dayFirst;
    return createNamedMonthDayIncrementer(monthText, dayText, (date, month, dayPaddingWidth) =>
      [formatDay(date, dayPaddingWidth), formatMonthName(date.getUTCMonth(), month)].join(separatorText)
    );
  }

  /**
   * Creates a named-month date incrementer.
   * Supports patterns like `Nov 30, 2026`, `Nov 30 2026`, `30 Nov 2026` and `2026 Nov 30`.
   */
  static createNamedMonthDateIncrementer(source: string): Incrementer | undefined {
    const monthDayYear = new RegExp(`^(${MONTH_NAME_PATTERN})([\\/-]|\\s+)(\\d{1,2})(,?\\s+|[\\/-])(\\d{4})$`, "u").exec(
      source
    );
    if (monthDayYear) {
      const [, monthText, firstSeparator, dayText, secondSeparator, yearText] = monthDayYear;
      return createNamedMonthDateIncrementer(monthText, dayText, yearText, (date, month, dayPaddingWidth) =>
        joinThree(
          formatMonthName(date.getUTCMonth(), month),
          firstSeparator,
          formatDay(date, dayPaddingWidth),
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
      return createNamedMonthDateIncrementer(monthText, dayText, yearText, (date, month, dayPaddingWidth) =>
        joinThree(
          formatDay(date, dayPaddingWidth),
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
    return createNamedMonthDateIncrementer(monthText, dayText, yearText, (date, month, dayPaddingWidth) =>
      joinThree(
        String(date.getUTCFullYear()).padStart(yearText.length, "0"),
        firstSeparator,
        formatMonthName(date.getUTCMonth(), month),
        secondSeparator,
        formatDay(date, dayPaddingWidth)
      )
    );
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
  const monthName =
    style.length === "sept" && monthIndex === 8 ? "Sept" : MONTHS[monthIndex][style.length === "long" ? 1 : 0];
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

function createNamedMonthDayIncrementer(
  monthText: string,
  dayText: string,
  format: (date: Date, month: MonthNameStyle, dayPaddingWidth: number) => string
): Incrementer | undefined {
  const month = parseMonthName(monthText);
  const day = Number(dayText);
  if (!month || !isValidMonthDay(month.index + 1, day)) {
    return undefined;
  }

  const start = new Date(Date.UTC(1970, month.index, day));
  const dayPaddingWidth = getExplicitPaddingWidth(dayText);
  return (index: number) => format(addDays(start, index), month, dayPaddingWidth);
}

function createNamedMonthDateIncrementer(
  monthText: string,
  dayText: string,
  yearText: string,
  format: (date: Date, month: MonthNameStyle, dayPaddingWidth: number) => string
): Incrementer | undefined {
  const month = parseMonthName(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  if (!month || !isValidDate(year, month.index + 1, day)) {
    return undefined;
  }

  const start = new Date(Date.UTC(year, month.index, day));
  const dayPaddingWidth = getExplicitPaddingWidth(dayText);
  return (index: number) => format(addDays(start, index), month, dayPaddingWidth);
}

function formatDay(date: Date, paddingWidth: number): string {
  return String(date.getUTCDate()).padStart(paddingWidth, "0");
}

function getExplicitPaddingWidth(source: string): number {
  return source.length > 1 && source.startsWith("0") ? source.length : 1;
}

function addDays(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));
}

function addMonths(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
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

function joinThree(first: string, firstSeparator: string, second: string, secondSeparator: string, third: string): string {
  return `${first}${firstSeparator}${second}${secondSeparator}${third}`;
}
