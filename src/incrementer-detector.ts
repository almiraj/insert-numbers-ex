import type { Incrementer } from "./incrementer";

import { createCharacterIncrementer, createJapaneseNumericIncrementer, createNumericIncrementer, createOnlyRepeatFormatter } from "./incrementer-factory";
import { createDateIncrementer, createDateTimeIncrementer, createTimeIncrementer } from "./incrementer-factory-datetime";

export function detectIncrementer(source: string): Incrementer | undefined {
  return (
    createDateTimeIncrementer(source) ??
    createDateIncrementer(source) ??
    createTimeIncrementer(source) ??
    createNumericIncrementer(source) ??
    createJapaneseNumericIncrementer(source) ??
    createCharacterIncrementer(source) ??
    createOnlyRepeatFormatter(source)
  );
}
