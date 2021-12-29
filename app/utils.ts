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

export function nbsp(str: string) {
  return str.replace(/\s/g, '\xa0');
}

export function now() {
  return DateTime.utc().toISO();
}

export function yearsFromNow(years: number) {
  return DateTime.utc().plus({ years }).toJSDate();
}

export function getTimeZone() {
  const timezone = DateTime.local().zoneName;
  if (timezone == 'UTC') {
    return 'Europe/London';
  }
  return timezone;
}

export function startOfDay(timezone?: string) {
  return local(timezone).startOf('day').toISO();
}

export function isToday(date: string, timezone?: string) {
  return DateTime.fromISO(date).toISODate() == local(timezone).toISODate();
}

export function todayDate(timezone?: string, locale = 'en'): string {
  return local(timezone).toLocaleString(DateTime.DATE_FULL, {
    locale,
  });
}

export function maxDate(
  date1: string,
  date2: string | null,
  timezone?: string
) {
  if (!date2) {
    return date1;
  }
  return DateTime.fromMillis(
    Math.max(
      DateTime.fromISO(date1, { zone: timezone }).toMillis(),
      DateTime.fromISO(date2, { zone: timezone }).toMillis()
    ),
    { zone: timezone }
  ).toISO();
}

export function formatTimeAgo(
  date: string,
  locale = 'en',
  timezone?: string
): string {
  const formatter = getFormatter(locale);
  let duration = DateTime.fromISO(date, { zone: timezone }).diff(
    local(timezone),
    'seconds'
  ).seconds;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name);
    }
    duration /= division.amount;
  }
  return '';
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

export function getEnv(name: string): string {
  let value: string | undefined;
  if ('process' in globalThis) {
    value = globalThis.process.env[name];
  } else if (name in globalThis) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value = (globalThis as any)[name];
  }
  if (!value) {
    throw new Error(`Missing ${name} env`);
  }
  return value;
}

function local(timezone?: string) {
  return DateTime.local({ zone: timezone });
}

const DIVISIONS: { amount: number; name: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' },
];

function getFormatter(locale: string) {
  let formatter: Intl.RelativeTimeFormat;
  if (formatters.has(locale)) {
    formatter = formatters.get(locale) as Intl.RelativeTimeFormat;
  } else {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    formatters.set(locale, formatter);
  }
  return formatter;
}

const formatters = new Map<string, Intl.RelativeTimeFormat>();
