import { z } from 'zod';
import { createClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { notFound, unprocessableEntity, badRequest } from 'remix-utils';
import { json, redirect } from 'remix';
import sortOn from 'sort-on';

import { now, isToday, startOfDay, isPresent, getEnv } from '~/utils';

const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_KEY'));

import {
  TodoCreate,
  TodoDelete,
  TodoSetChecked,
  TodoSetTitle,
  TodoSetPinned,
  DeleteAccount,
  Todo,
  booleanFromString,
  CommandName,
  CommandError,
  CommandData,
} from '~/types';

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

const TodoDTO = z.object({
  id: z.string().uuid(),
  title: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  checked_at: z.string().nullable(),
  pinned_at: z.string().nullable(),
});
type TodoDTO = z.infer<typeof TodoDTO>;

const Command = z.union([
  TodoCreateCommand,
  TodoDeleteCommand,
  TodoSetCheckedCommand,
  TodoSetTitleCommand,
  TodoSetPinnedCommand,
  DeleteAccountCommand,
]);
type Command = z.infer<typeof Command>;

function toJSON(todo: TodoDTO): Todo {
  return {
    id: todo.id,
    title: todo.title,
    checked: todo.checked_at != null,
    createdAt: todo.created_at,
    pinnedAt: todo.pinned_at,
  };
}

function createTodo({ userId, title }: { userId: string; title: string }) {
  return supabase
    .from<TodoDTO>('todos')
    .insert({ title, user_id: userId })
    .select('id')
    .single()
    .then(handleSingleError(TodoCreate));
}

function deleteTodo({ userId, id }: { userId: string; id: string }) {
  return supabase
    .from<TodoDTO>('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single()
    .then(handleSingleError(TodoDelete));
}

function setTodoChecked({
  userId,
  id,
  checked,
}: {
  userId: string;
  id: string;
  checked: boolean;
}) {
  return supabase
    .from<TodoDTO>('todos')
    .update({ checked_at: checked ? now() : null })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single()
    .then(handleSingleError(TodoSetChecked));
}

function setTodoPinned({ userId, id }: { userId: string; id: string }) {
  return supabase
    .from<TodoDTO>('todos')
    .update({ pinned_at: now() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single()
    .then(handleSingleError(TodoSetPinned));
}

function setTodoTitle({
  userId,
  id,
  title,
}: {
  userId: string;
  id: string;
  title: string;
}) {
  return supabase
    .from<TodoDTO>('todos')
    .update({ title })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single()
    .then(handleSingleError(TodoSetTitle));
}

function deleteAccount({ userId }: { userId: string }) {
  return supabase
    .from<TodoDTO>('todos')
    .delete()
    .eq('user_id', userId)
    .then(() => redirect('/signout'));
}

export async function getTodos({
  userId,
  timezone,
}: {
  userId: string;
  timezone?: string;
}): Promise<{
  todos: Todo[];
  looseEnds: Todo[];
  timezone?: string;
}> {
  const { data: todos } = await supabase
    .from<TodoDTO>('todos')
    .select('id,title,created_at,checked_at,pinned_at')
    .eq('user_id', userId)
    .or(`checked_at.gte.${startOfDay()},checked_at.is.null`)
    .order('created_at', { ascending: true });

  if (todos) {
    const looseEnds = todos
      .filter((task) => isLooseEnd(task, timezone))
      .map(toJSON);
    return {
      todos: todos
        .filter((task) => isRelevantToday(task, timezone))
        .map(toJSON),
      looseEnds: sortOn(looseEnds, ['pinnedAt', '-createdAt']),
      timezone,
    };
  }
  return { todos: [], looseEnds: [] };
}

export type Stats = {
  stats: { done: number; focused: string; scope: 'overall' | 'today' };
  done: { scope: 'week' | 'month' | 'year' };
  focused: { scope: 'week' | 'month' | 'year' };
};

export async function getStats({
  userId,
  scopes,
}: {
  userId: string;
  scopes: {
    stats: Stats['stats']['scope'];
    done: Stats['done']['scope'];
    focused: Stats['focused']['scope'];
  };
}): Promise<Stats> {
  const { data: tasks } = await supabase
    .from<TodoDTO>('todos')
    .select('checked_at')
    .eq('user_id', userId)
    .not('checked_at', 'is', null);

  if (tasks) {
    const doneDates = tasks
      .map(({ checked_at }) => checked_at)
      .filter(isPresent)
      .map((checkedAt) => ({ checkedAt }));

    return {
      stats: {
        done: doneDates.length,
        focused: 'PT0H00M',
        scope: scopes.stats,
      },
      done: {
        scope: scopes.done,
      },
      focused: {
        scope: scopes.focused,
      },
    };
  }
  return {
    stats: { done: 0, focused: 'PT0H00M', scope: 'overall' },
    done: { scope: 'week' },
    focused: { scope: 'week' },
  };
}

function handleSingleError(
  command: CommandName
): ({ data, error }: PostgrestSingleResponse<TodoDTO>) => Response {
  return ({ data, error }) => {
    if (data) {
      return json<CommandData>({ data: { id: data.id }, command });
    } else if (error) {
      return unprocessableEntity<CommandError>({
        error: error.message,
        command,
      });
    }
    return notFound<CommandError>({ error: 'Not Found', command });
  };
}

export async function executeCommand(
  formData: FormData,
  { userId }: { userId: string }
): Promise<Response> {
  const command = Command.safeParse(Object.fromEntries(formData));

  if (command.success) {
    switch (command.data.command) {
      case TodoCreate:
        return createTodo({ userId, title: command.data.title ?? '' });
      case TodoDelete:
        return deleteTodo({ userId, id: command.data.id });
      case TodoSetChecked:
        return setTodoChecked({
          userId,
          id: command.data.id,
          checked: command.data.checked,
        });
      case TodoSetTitle:
        return setTodoTitle({
          userId,
          id: command.data.id,
          title: command.data.title,
        });
      case TodoSetPinned:
        return setTodoPinned({ userId, id: command.data.id });
      case DeleteAccount:
        return deleteAccount({ userId });
    }
  }

  return badRequest<CommandError>({
    error: command.error.message,
    command: 'Unknown',
  });
}

function isRelevantToday(todo: TodoDTO, timezone?: string): boolean {
  return (
    isToday(todo.created_at, timezone) ||
    (isPinned(todo, timezone) && isUncheckedOrCheckedToday(todo, timezone))
  );
}

function isLooseEnd(todo: TodoDTO, timezone?: string): boolean {
  return (
    !isRelevantToday(todo, timezone) &&
    isUncheckedOrCheckedToday(todo, timezone)
  );
}

function isUncheckedOrCheckedToday(todo: TodoDTO, timezone?: string): boolean {
  return !todo.checked_at || isToday(todo.checked_at, timezone);
}

function isPinned(todo: TodoDTO, timezone?: string): boolean {
  return !!todo.pinned_at && isToday(todo.pinned_at, timezone);
}
