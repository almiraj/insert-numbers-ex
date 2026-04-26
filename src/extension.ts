import * as vscode from "vscode";

type SequenceFormatter = (index: number) => string;

type DateShape =
  | { kind: "ymd-separated"; yearWidth: number; monthWidth: number; dayWidth: number; separator: "/" | "-" }
  | { kind: "mdy-separated"; yearWidth: number; monthWidth: number; dayWidth: number; separator: "/" | "-" }
  | { kind: "ym-slash"; yearWidth: number; monthWidth: number; separator: "/" | "-" }
  | { kind: "ymd-compact" }
  | { kind: "ym-compact" };

type TimeShape = { withSeconds: boolean; hourWidth: number; minuteWidth: number; secondWidth?: number };

type DateTimeShape = {
  date: Extract<DateShape, { kind: "ymd-separated" }>;
  time: Required<TimeShape>;
  separator: string;
};

const PREVIEW_DECORATION = vscode.window.createTextEditorDecorationType({
  color: "transparent",
  after: {
    color: new vscode.ThemeColor("editorCodeLens.foreground")
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
      inputBox.prompt = "Support: 0, 1, 01, [1], 2026-04-29 23:59:58";
      inputBox.placeholder = "0, 1, 01, [1], 2026-04-29 23:59:58";
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
          editor.selections.map((selection, index) =>
            createPreviewDecoration(editor.document, selection, formatter(index))
          )
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
            editBuilder.replace(getInsertionRange(editor.document, selection), formatter(index));
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

function getInsertionRange(document: vscode.TextDocument, selection: vscode.Selection): vscode.Range {
  const activeLine = document.lineAt(selection.active.line);
  if (activeLine.isEmptyOrWhitespace) {
    return new vscode.Range(activeLine.range.start, activeLine.range.end);
  }

  return selection;
}

function createPreviewDecoration(
  document: vscode.TextDocument,
  selection: vscode.Selection,
  contentText: string
): vscode.DecorationOptions {
  const range = getInsertionRange(document, selection);
  const activeLine = document.lineAt(selection.active.line);
  if (activeLine.text.length === 0) {
    return {
      range,
      renderOptions: {
        before: {
          color: "#93c5fd",
          contentText
        }
      }
    };
  }

  if (range.isEmpty) {
    return {
      range,
      renderOptions: {
        after: {
          color: "#93c5fd",
          contentText
        }
      }
    };
  }

  return {
    range,
    renderOptions: {
      before: {
        color: "#93c5fd",
        contentText
      }
    }
  };
}

function detectSequenceFormatter(source: string): SequenceFormatter | undefined {
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
  const match = /^([^\d]*?)(\d+)([^\d]*)$/su.exec(source);
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
        kind: "ymd-separated",
        yearWidth: part1.length,
        monthWidth: part2.length,
        dayWidth: part3.length,
        separator: "/"
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
        monthWidth: part1.length,
        dayWidth: part2.length,
        separator: "/"
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
      kind: "ymd-separated",
      yearWidth: yearText.length,
      monthWidth: monthText.length,
      dayWidth: dayText.length,
      separator: dateSeparator as "/" | "-"
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
    return formatDateTime(value, shape);
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
    case "ym-slash":
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

function isValidTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}
