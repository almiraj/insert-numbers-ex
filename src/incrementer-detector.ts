import type { Incrementer } from "./incrementer";

import IncrementerFactory from "./incrementer-factory";
import DatetimeIncrementerFactory from "./incrementer-factory-datetime";

/**
 * Detects an incrementer from the source text.
 */
export function detectIncrementer(source: string): Incrementer | undefined {
  return (
    DatetimeIncrementerFactory.createFullDateTimeIncrementer(source) ??
    DatetimeIncrementerFactory.createYmdIncrementer(source) ??
    DatetimeIncrementerFactory.createMdydIncrementer(source) ??
    DatetimeIncrementerFactory.createMdIncrementer(source) ??
    DatetimeIncrementerFactory.createYmIncrementer(source) ??
    DatetimeIncrementerFactory.createTimeWithSecondIncrementer(source) ??
    DatetimeIncrementerFactory.createTimeWithoutSecondIncrementer(source) ??
    IncrementerFactory.createJapaneseNumericIncrementer(source) ??
    IncrementerFactory.createCharacterIncrementer(source) ??
    IncrementerFactory.createNumericIncrementer(source) ??
    IncrementerFactory.createOnlyRepeatFormatter(source)
  );
}
