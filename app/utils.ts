import { DateTime } from 'luxon';
import { isHotkey } from 'is-hotkey';

export const isEnterKey = isHotkey('enter');
export const isBackspaceKey = isHotkey('backspace');
export const isEscapeKey = isHotkey('escape');

function cursorPosition(input: HTMLInputElement): number {
  return (
    (input.selectionDirection == 'backward'
      ? input.selectionStart
      : input.selectionEnd) ?? 0
  );
}

export function cursorAtStart(input: HTMLInputElement): boolean {
  return cursorPosition(input) == 0;
}

export function cursorAtEnd(input: HTMLInputElement): boolean {
  return cursorPosition(input) == input.value.length;
}

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function todayDate(): string {
  return DateTime.local().toFormat('dd MMMM yyyy');
}

export function nbsp(str: string) {
  return str.replace(/\s/g, '\xa0');
}

export function now() {
  return DateTime.utc().toISO();
}

export function yearsFromNow(years: number) {
  return DateTime.utc().plus({ years }).toJSDate();
}

function local(zone = 'Europe/Paris') {
  return DateTime.local({ zone });
}

export function startOfDay(zone?: string) {
  return local(zone).startOf('day').toISO();
}

export function endOfDay(zone?: string) {
  return local(zone).endOf('day').toISO();
}

export function isToday(date: string, zone?: string) {
  return DateTime.fromISO(date).toISODate() == local(zone).toISODate();
}

export function isPresent<T>(value: T | undefined | null | void): value is T {
  if (value == null) {
    return false;
  }
  if (typeof value == 'boolean') {
    return value;
  } else if (typeof value == 'string') {
    return value.trim().length > 0;
  } else if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}
