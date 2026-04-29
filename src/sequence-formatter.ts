export type SequenceFormatter = (index: number) => string;

type DateSeparator = "/" | "-";

type DateShape =
  | { kind: "ymd-separated"; yearWidth: number; monthWidth: number; dayWidth: number; separator: DateSeparator }
  | { kind: "mdy-separated"; yearWidth: number; monthWidth: number; dayWidth: number; separator: DateSeparator }
  | { kind: "md-separated"; monthWidth: number; dayWidth: number; separator: DateSeparator }
  | { kind: "ym-separated"; yearWidth: number; monthWidth: number; separator: DateSeparator }
  | { kind: "ymd-compact" }
  | { kind: "ym-compact" };

type TimeShape = { withSeconds: boolean; hourWidth: number; minuteWidth: number; secondWidth?: number };

type DateTimeShape = {
  date: Extract<DateShape, { kind: "ymd-separated" }>;
  time: Required<TimeShape>;
  separator: string;
};

export function detectSequenceFormatter(source: string): SequenceFormatter | undefined {
  return (
    createDateTimeSequenceFormatter(source) ??
    createDateSequenceFormatter(source) ??
    createTimeSequenceFormatter(source) ??
    createNumericSequenceFormatter(source) ??
    createCharacterSequenceFormatter(source) ??
    createOnlyRepeatFormatter(source)
  );
}

/**
 * Creates a numeric sequence formatter.
 * Supports patterns like `1`, `1_`, `[1]`, and `01`.
 */
function createNumericSequenceFormatter(source: string): SequenceFormatter | undefined {
  const match = /^(.*?)(\d+)(.*)$/su.exec(source);
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
 * Creates a date sequence formatter.
 * Supports patterns like `2026/04/29`, `2026-04-29`, `2026/4/29`, `20260429`, `04/29/2026`, `04-29-2026`, `2026/04`, `2026-04` and `202604`.
 */
function createDateSequenceFormatter(source: string): SequenceFormatter | undefined {
  const monthDayMatch = /^(\d{1,2})([\/-])(\d{1,2})$/u.exec(source);
  if (monthDayMatch) {
    const [, monthText, separatorText, dayText] = monthDayMatch;
    const separator = asDateSeparator(separatorText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!isValidMonthDay(month, day)) {
      return undefined;
    }

    const start = new Date(Date.UTC(1970, month - 1, day));
    const shape: DateShape = {
      kind: "md-separated",
      monthWidth: getDatePartWidth(monthText),
      dayWidth: getDatePartWidth(dayText, monthText),
      separator
    };
    return (index: number) => formatDate(addDays(start, index), shape);
  }

  const yearMonthMatch = /^(\d{4})([\/-])(\d{1,2})$/u.exec(source);
  if (yearMonthMatch && Number(yearMonthMatch[1]) >= 1970) {
    const [, yearText, separatorText, monthText] = yearMonthMatch;
    const separator = asDateSeparator(separatorText);
    const year = Number(yearText);
    const month = Number(monthText);
    if (month < 1 || month > 12) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const shape: DateShape = {
      kind: "ym-separated",
      yearWidth: yearText.length,
      monthWidth: getDatePartWidth(monthText),
      separator
    };
    return (index: number) => formatDate(addMonths(start, index), shape);
  }

  const separatedMatch = /^(\d{1,4})([\/-])(\d{1,2})\2(\d{1,4})$/u.exec(source);
  if (separatedMatch) {
    const [, part1, separatorText, part2, part3] = separatedMatch;
    const separator = asDateSeparator(separatorText);
    if (part1.length === 4 && Number(part1) >= 1970) {
      const year = Number(part1);
      const month = Number(part2);
      const day = Number(part3);
      if (!isValidDate(year, month, day)) {
        return undefined;
      }

      const start = new Date(Date.UTC(year, month - 1, day));
      const shape: DateShape = {
        kind: "ymd-separated",
        yearWidth: part1.length,
        monthWidth: getDatePartWidth(part2),
        dayWidth: getDatePartWidth(part3, part2),
        separator
      };
      return (index: number) => formatDate(addDays(start, index), shape);
    }

    if (part3.length === 4 && Number(part3) >= 1970) {
      const month = Number(part1);
      const day = Number(part2);
      const year = Number(part3);
      if (!isValidDate(year, month, day)) {
        return undefined;
      }

      const start = new Date(Date.UTC(year, month - 1, day));
      const shape: DateShape = {
        kind: "mdy-separated",
        yearWidth: part3.length,
        monthWidth: getDatePartWidth(part1),
        dayWidth: getDatePartWidth(part2, part1),
        separator
      };
      return (index: number) => formatDate(addDays(start, index), shape);
    }
  }

  if (/^\d{8}$/u.test(source) && Number(source.slice(0, 4)) >= 1970) {
    const year = Number(source.slice(0, 4));
    const month = Number(source.slice(4, 6));
    const day = Number(source.slice(6, 8));
    if (!isValidDate(year, month, day)) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, day));
    return (index: number) => formatDate(addDays(start, index), { kind: "ymd-compact" });
  }

  if (/^\d{6}$/u.test(source) && Number(source.slice(0, 4)) >= 1970) {
    const year = Number(source.slice(0, 4));
    const month = Number(source.slice(4, 6));
    if (month < 1 || month > 12) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    return (index: number) => formatDate(addMonths(start, index), { kind: "ym-compact" });
  }

  return undefined;
}

function createTimeSequenceFormatter(source: string): SequenceFormatter | undefined {
  const withSeconds = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/u.exec(source);
  if (withSeconds) {
    const [, hourText, minuteText, secondText] = withSeconds;
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    if (!isValidTime(hour, minute, second)) {
      return undefined;
    }

    const start = new Date(Date.UTC(1970, 0, 1, hour, minute, second));
    const shape: TimeShape = {
      withSeconds: true,
      hourWidth: hourText.length,
      minuteWidth: minuteText.length,
      secondWidth: secondText.length
    };
    return (index: number) => formatTime(addSeconds(start, index), shape);
  }

  const withoutSeconds = /^(\d{1,2}):(\d{1,2})$/u.exec(source);
  if (!withoutSeconds) {
    return undefined;
  }

  const [, hourText, minuteText] = withoutSeconds;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!isValidTime(hour, minute, 0)) {
    return undefined;
  }

  const start = new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
  const shape: TimeShape = {
    withSeconds: false,
    hourWidth: hourText.length,
    minuteWidth: minuteText.length
  };
  return (index: number) => formatTime(addMinutes(start, index), shape);
}

function createDateTimeSequenceFormatter(source: string): SequenceFormatter | undefined {
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

  if (!isValidDate(year, month, day)) {
    return undefined;
  }

  const dateShape: Extract<DateShape, { kind: "ymd-separated" }> = {
    kind: "ymd-separated",
    yearWidth: yearText.length,
    monthWidth: monthText.length,
    dayWidth: dayText.length,
    separator: dateSeparator
  };

  if (!isValidDateTimeTime(hour, minute, second)) {
    return undefined;
  }

  const start = Date.UTC(year, month - 1, day, hour, minute, second);
  const shape: DateTimeShape = {
    date: dateShape,
    time: {
      withSeconds: true,
      hourWidth: hourText.length,
      minuteWidth: minuteText.length,
      secondWidth: secondText.length
    },
    separator
  };

  return (index: number) => {
    const value = new Date(start + index * 1000);
    return formatDateTime(value, shape);
  };
}

/**
 * Creates a character sequence formatter.
 * Supports patterns like `a`, `１`, ①, Ⅰ, `あ` and `ア`.
 */
function createCharacterSequenceFormatter(source: string): SequenceFormatter | undefined {
  const characterSets = [
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "０１２３４５６７８９",
    "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚",
    "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ",
    "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん",
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
    "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ"
  ];

  const match = /^([^\d]*?)(.)(.*)$/su.exec(source);
  if (!match) {
    return undefined;
  }

  const [, prefix, char, suffix] = match;

  for (const set of characterSets) {
    const members = [...set];
    const startIndex = members.indexOf(char);
    if (startIndex >= 0) {
      return (offset: number) => `${prefix}${members[(startIndex + offset) % members.length]}${suffix}`;
    }
  }

  const codePoint = char.codePointAt(0);
  if (codePoint !== undefined && /\p{L}|\p{N}/u.test(char)) {
    return (offset: number) => `${prefix}${String.fromCodePoint(codePoint + offset)}${suffix}`;
  }
  return undefined;
}

function createOnlyRepeatFormatter(source: string): SequenceFormatter | undefined {
  if (source.length === 0) {
    return undefined;
  }

  return () => source;
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

function formatDate(date: Date, shape: DateShape): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1);
  const day = String(date.getUTCDate());

  switch (shape.kind) {
    case "ymd-separated":
      return [
        year.padStart(shape.yearWidth, "0"),
        month.padStart(shape.monthWidth, "0"),
        day.padStart(shape.dayWidth, "0")
      ].join(shape.separator);
    case "mdy-separated":
      return [
        month.padStart(shape.monthWidth, "0"),
        day.padStart(shape.dayWidth, "0"),
        year.padStart(shape.yearWidth, "0")
      ].join(shape.separator);
    case "md-separated":
      return [month.padStart(shape.monthWidth, "0"), day.padStart(shape.dayWidth, "0")].join(shape.separator);
    case "ym-separated":
      return `${year.padStart(shape.yearWidth, "0")}${shape.separator}${month.padStart(shape.monthWidth, "0")}`;
    case "ymd-compact":
      return `${year.padStart(4, "0")}${month.padStart(2, "0")}${day.padStart(2, "0")}`;
    case "ym-compact":
      return `${year.padStart(4, "0")}${month.padStart(2, "0")}`;
  }
}

function formatDateTime(date: Date, shape: DateTimeShape): string {
  return formatDate(date, shape.date) + shape.separator + formatTime(date, shape.time);
}

function formatTime(date: Date, shape: TimeShape): string {
  const hour = String(date.getUTCHours()).padStart(shape.hourWidth, "0");
  const minute = String(date.getUTCMinutes()).padStart(shape.minuteWidth, "0");

  if (shape.withSeconds) {
    const second = String(date.getUTCSeconds()).padStart(shape.secondWidth ?? 2, "0");
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
