import type { Incrementer } from "./incrementer";

import IncrementerFactory from "./incrementer-factory";
import DatetimeIncrementerFactory from "./incrementer-factory-datetime";
import DatetimeNamedIncrementerFactory from "./incrementer-factory-datetime-named";

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
    DatetimeIncrementerFactory.createMyIncrementer(source) ??
    DatetimeIncrementerFactory.createTimeWithSecondIncrementer(source) ??
    DatetimeIncrementerFactory.createTimeWithoutSecondIncrementer(source) ??
    DatetimeNamedIncrementerFactory.createNamedMonthDateIncrementer(source) ??
    DatetimeNamedIncrementerFactory.createNamedMonthDayIncrementer(source) ??
    DatetimeNamedIncrementerFactory.createNamedMonthYearIncrementer(source) ??
    DatetimeNamedIncrementerFactory.createNamedMonthIncrementer(source) ??
    IncrementerFactory.createHexadecimalIncrementer(source) ??
    IncrementerFactory.createCharacterIncrementer(source) ??
    IncrementerFactory.createJapaneseNumericIncrementer(source) ??
    IncrementerFactory.createSpacePaddedNumericIncrementer(source) ??
    IncrementerFactory.createNumericIncrementer(source) ??
    IncrementerFactory.createOnlyRepeatFormatter(source)
  );
}
