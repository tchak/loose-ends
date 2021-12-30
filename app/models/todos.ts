import { z } from 'zod';

import { isToday, booleanFromString } from '~/utils';

export const Todo = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
  checkedAt: z.string().nullable(),
  pinnedAt: z.string().nullable(),
  hidden: z.boolean().nullish(),
});
export type Todo = z.infer<typeof Todo>;

export const TodoCreate = 'TodoCreate' as const;
export const TodoDelete = 'TodoDelete' as const;
export const TodoSetChecked = 'TodoSetChecked' as const;
export const TodoSetTitle = 'TodoSetTitle' as const;
export const TodoSetPinned = 'TodoSetPinned' as const;
export const DeleteAccount = 'DeleteAccount' as const;

export type CommandName =
  | typeof TodoCreate
  | typeof TodoDelete
  | typeof TodoSetChecked
  | typeof TodoSetTitle
  | typeof TodoSetPinned
  | typeof DeleteAccount;

export type CommandData = { data: { id: string }; command: CommandName };
export type CommandError = { error: string; command: CommandName | 'Unknown' };
export type CommandResult = CommandData | CommandError;

const TodoCreateCommand = z.object({
  command: z.literal(TodoCreate),
  title: z.string().optional(),
});
const TodoDeleteCommand = z.object({
  command: z.literal(TodoDelete),
  id: z.string().uuid(),
});
const TodoSetCheckedCommand = z.object({
  command: z.literal(TodoSetChecked),
  id: z.string().uuid(),
  checked: booleanFromString(),
});
const TodoSetPinnedCommand = z.object({
  command: z.literal(TodoSetPinned),
  id: z.string().uuid(),
});
const TodoSetTitleCommand = z.object({
  command: z.literal(TodoSetTitle),
  id: z.string().uuid(),
  title: z.string(),
});
const DeleteAccountCommand = z.object({
  command: z.literal(DeleteAccount),
});

export const Command = z.union([
  TodoCreateCommand,
  TodoDeleteCommand,
  TodoSetCheckedCommand,
  TodoSetTitleCommand,
  TodoSetPinnedCommand,
  DeleteAccountCommand,
]);

export function isRelevantToday(todo: Todo, timezone?: string): boolean {
  return (
    isToday(todo.createdAt, timezone) ||
    (isPinned(todo, timezone) && isUncheckedOrCheckedToday(todo, timezone))
  );
}

export function isLooseEnd(todo: Todo, timezone?: string): boolean {
  return (
    !isRelevantToday(todo, timezone) &&
    isUncheckedOrCheckedToday(todo, timezone)
  );
}

function isUncheckedOrCheckedToday(todo: Todo, timezone?: string): boolean {
  return !todo.checkedAt || isToday(todo.checkedAt, timezone);
}

function isPinned(todo: Todo, timezone?: string): boolean {
  return !!todo.pinnedAt && isToday(todo.pinnedAt, timezone);
}

export type LoaderData = { todos: Todo[]; timezone?: string };
