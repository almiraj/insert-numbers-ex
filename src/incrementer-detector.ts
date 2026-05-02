import type { Incrementer } from "./incrementer";

import * as factory from "./incrementer-factory";
import * as datetimeFactory from "./incrementer-factory-datetime";

export function detectIncrementer(source: string): Incrementer | undefined {
  return (
    datetimeFactory.createDateTimeIncrementer(source) ??
    datetimeFactory.createDateIncrementer(source) ??
    datetimeFactory.createTimeIncrementer(source) ??
    factory.createNumericIncrementer(source) ??
    factory.createJapaneseNumericIncrementer(source) ??
    factory.createCharacterIncrementer(source) ??
    factory.createOnlyRepeatFormatter(source)
  );
}
