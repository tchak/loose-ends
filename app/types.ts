import { z } from 'zod';

export const TodoCreate = 'TodoCreate' as const;
export const TodoDelete = 'TodoDelete' as const;
export const TodoSetChecked = 'TodoSetChecked' as const;
export const TodoSetTitle = 'TodoSetTitle' as const;
export const TodoSetPinned = 'TodoSetPinned' as const;
export const DeleteAccount = 'DeleteAccount' as const;

export const Todo = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
  checkedAt: z.string().nullable(),
  pinnedAt: z.string().nullable(),
  hidden: z.boolean().nullish(),
});
export type Todo = z.infer<typeof Todo>;

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

export const booleanFromString = () =>
  z.enum(['true', 'false']).transform((checked) => checked == 'true');
