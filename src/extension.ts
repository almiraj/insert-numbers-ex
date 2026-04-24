import * as vscode from "vscode";

type SequenceFormatter = (index: number) => string;

type DateShape =
  | { kind: "ymd-slash"; yearWidth: number; monthWidth: number; dayWidth: number }
  | { kind: "mdy-slash"; yearWidth: number; monthWidth: number; dayWidth: number }
  | { kind: "ym-slash"; yearWidth: number; monthWidth: number; separator: "/" | "-" }
  | { kind: "ymd-compact" }
  | { kind: "ym-compact" };

type TimeShape = { withSeconds: boolean; hourWidth: number; minuteWidth: number; secondWidth?: number };

type DateTimeShape = {
  date: Extract<DateShape, { kind: "ymd-slash" }>;
  time: Required<TimeShape>;
  separator: string;
};

const PREVIEW_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    color: new vscode.ThemeColor("editorCodeLens.foreground"),
    margin: "0 0 0 1ch"
  },
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
});

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(PREVIEW_DECORATION);
  context.subscriptions.push(
    vscode.commands.registerCommand("insert-numbers.insertNumbers", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showInformationMessage("Insert Numbers requires an active editor.");
        return;
      }

      const inputBox = vscode.window.createInputBox();
      inputBox.title = "Insert Numbers";
      inputBox.prompt = "Examples: 1, 01, 1_, a, あ, 2026/04/29, 23:59:58";
      inputBox.placeholder = "Type a value to preview and press Enter";
      inputBox.ignoreFocusOut = true;

      const clearPreview = () => {
        editor.setDecorations(PREVIEW_DECORATION, []);
      };

      const renderPreview = (value: string) => {
        const formatter = detectSequenceFormatter(value);
        if (!formatter) {
          inputBox.validationMessage = value.length === 0 ? undefined : "Unsupported pattern.";
          clearPreview();
          return;
        }

        inputBox.validationMessage = undefined;
        editor.setDecorations(
          PREVIEW_DECORATION,
          editor.selections.map((selection, index) => ({
            range: new vscode.Range(selection.active, selection.active),
            renderOptions: {
              after: {
                color: "#93c5fd",
                contentText: formatter(index)
              }
            }
          }))
        );
      };

      inputBox.onDidChangeValue(renderPreview);
      inputBox.onDidAccept(async () => {
        const formatter = detectSequenceFormatter(inputBox.value);
        if (!formatter) {
          inputBox.validationMessage = "Unsupported pattern.";
          return;
        }

        const selections = [...editor.selections];
        await editor.edit((editBuilder) => {
          selections.forEach((selection, index) => {
            editBuilder.replace(selection, formatter(index));
          });
        });

        clearPreview();
        inputBox.hide();
      });
      inputBox.onDidHide(() => {
        clearPreview();
        inputBox.dispose();
      });

      renderPreview(inputBox.value);
      inputBox.show();
    })
  );
}

export function deactivate(): void {}

function detectSequenceFormatter(source: string): SequenceFormatter | undefined {
  return (
    createDateTimeSequenceFormatter(source) ??
    createDateSequenceFormatter(source) ??
    createTimeSequenceFormatter(source) ??
    createNumericSequenceFormatter(source) ??
    createCharacterSequenceFormatter(source)
  );
}

/**
 * Creates a numeric sequence formatter.
 * Supports patterns like `1`, `1_` and `01`.
 */
function createNumericSequenceFormatter(source: string): SequenceFormatter | undefined {
  const match = /^(.*?)(\d+)([^\d]*)$/su.exec(source);
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
 * Supports patterns like `2026/04/29`, `2026/4/29`, `20260429`, `04/29/2026`, `4/29/2026`, `2026/04` and `202604`.
 */
function createDateSequenceFormatter(source: string): SequenceFormatter | undefined {
  const yearMonthMatch = /^(\d{4})\/(\d{1,2})$/u.exec(source);
  if (yearMonthMatch && Number(yearMonthMatch[1]) >= 1970) {
    const [, yearText, monthText] = yearMonthMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    if (month < 1 || month > 12) {
      return undefined;
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const shape: DateShape = {
      kind: "ym-slash",
      yearWidth: yearText.length,
      monthWidth: 2,
      separator: "/"
    };
    return (index: number) => formatDate(addMonths(start, index), shape);
  }

  const slashMatch = /^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/u.exec(source);
  if (slashMatch) {
    const [, part1, part2, part3] = slashMatch;
    if (part1.length === 4 && Number(part1) >= 1970) {
      const year = Number(part1);
      const month = Number(part2);
      const day = Number(part3);
      if (!isValidDate(year, month, day)) {
        return undefined;
      }

      const start = new Date(Date.UTC(year, month - 1, day));
      const shape: DateShape = {
        kind: "ymd-slash",
        yearWidth: part1.length,
        monthWidth: part2.length,
        dayWidth: part3.length
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
        kind: "mdy-slash",
        yearWidth: part3.length,
        monthWidth: part1.length,
        dayWidth: part2.length
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

    const start = hour * 3600 + minute * 60 + second;
    const shape: TimeShape = {
      withSeconds: true,
      hourWidth: hourText.length,
      minuteWidth: minuteText.length,
      secondWidth: secondText.length
    };
    return (index: number) => formatTime((start + index) % 86400, shape);
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

  const start = hour * 60 + minute;
  const shape: TimeShape = {
    withSeconds: false,
    hourWidth: hourText.length,
    minuteWidth: minuteText.length
  };
  return (index: number) => formatTime((start + index) % 1440, shape);
}

function createDateTimeSequenceFormatter(source: string): SequenceFormatter | undefined {
  const match = /^(\d{4})([\/-])(\d{1,2})\2(\d{1,2})(\s+)(\d{1,2}):(\d{1,2}):(\d{1,2})$/u.exec(source);
  if (!match) {
    return undefined;
  }

  const [, yearText, dateSeparator, monthText, dayText, separator, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  if (!isValidDate(year, month, day) || !isValidTime(hour, minute, second)) {
    return undefined;
  }

  const start = Date.UTC(year, month - 1, day, hour, minute, second);
  const shape: DateTimeShape = {
    date: {
      kind: "ymd-slash",
      yearWidth: yearText.length,
      monthWidth: monthText.length,
      dayWidth: dayText.length
    },
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
    const dateText =
      dateSeparator === "-"
        ? `${String(value.getUTCFullYear()).padStart(shape.date.yearWidth, "0")}-${String(
            value.getUTCMonth() + 1
          ).padStart(shape.date.monthWidth, "0")}-${String(value.getUTCDate()).padStart(shape.date.dayWidth, "0")}`
        : formatDate(value, shape.date);
    return `${dateText}${shape.separator}${formatTime(
      value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds(),
      shape.time
    )}`;
  };
}

/**
 * Creates a character sequence formatter.
 * Supports patterns like `a`, `１`, `あ` and `ア`.
 */
function createCharacterSequenceFormatter(source: string): SequenceFormatter | undefined {
  const characterSets = [
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "０１２３４５６７８９",
    "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん",
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
    "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ"
  ];
  const chars = [...source];
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const prefix = chars.slice(0, index).join("");
    const suffix = chars.slice(index + 1).join("");

    for (const set of characterSets) {
      const members = [...set];
      const startIndex = members.indexOf(char);
      if (startIndex >= 0) {
        return (offset: number) => `${prefix}${members[startIndex + offset] ?? ""}${suffix}`;
      }
    }

    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && /\p{L}|\p{N}/u.test(char)) {
      return (offset: number) => `${prefix}${String.fromCodePoint(codePoint + offset)}${suffix}`;
    }
  }
  return undefined;
}

function addDays(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));
}

function addMonths(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function formatDate(date: Date, shape: DateShape): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1);
  const day = String(date.getUTCDate());

  switch (shape.kind) {
    case "ymd-slash":
      return `${year.padStart(shape.yearWidth, "0")}/${month.padStart(shape.monthWidth, "0")}/${day.padStart(
        shape.dayWidth,
        "0"
      )}`;
    case "mdy-slash":
      return `${month.padStart(shape.monthWidth, "0")}/${day.padStart(shape.dayWidth, "0")}/${year.padStart(
        shape.yearWidth,
        "0"
      )}`;
    case "ym-slash":
      return `${year.padStart(shape.yearWidth, "0")}${shape.separator}${month.padStart(shape.monthWidth, "0")}`;
    case "ymd-compact":
      return `${year.padStart(4, "0")}${month.padStart(2, "0")}${day.padStart(2, "0")}`;
    case "ym-compact":
      return `${year.padStart(4, "0")}${month.padStart(2, "0")}`;
  }
}

function formatTime(totalSeconds: number, shape: TimeShape): string {
  if (shape.withSeconds) {
    const normalized = ((totalSeconds % 86400) + 86400) % 86400;
    const hour = Math.floor(normalized / 3600);
    const minute = Math.floor((normalized % 3600) / 60);
    const second = normalized % 60;
    return `${String(hour).padStart(shape.hourWidth, "0")}:${String(minute).padStart(
      shape.minuteWidth,
      "0"
    )}:${String(second).padStart(shape.secondWidth ?? 2, "0")}`;
  }

  const normalized = ((totalSeconds % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(shape.hourWidth, "0")}:${String(minute).padStart(shape.minuteWidth, "0")}`;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}
