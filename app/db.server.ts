import { z } from 'zod';
import { createClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { notFound, unprocessableEntity, badRequest } from 'remix-utils';
import { json, redirect } from 'remix';

import { now, startOfDay, isPresent, getEnv } from '~/utils';

const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_KEY'));

import {
  TodoCreate,
  TodoDelete,
  TodoSetChecked,
  TodoSetTitle,
  TodoSetPinned,
  DeleteAccount,
  Todo,
  Command,
  CommandName,
  CommandError,
  CommandData,
} from '~/models/todos';

const TodoEntity = z.object({
  id: z.string().uuid(),
  title: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  checked_at: z.string().nullable(),
  pinned_at: z.string().nullable(),
});
type TodoEntity = z.infer<typeof TodoEntity>;

function toJSON(todo: TodoEntity): Todo {
  return {
    id: todo.id,
    title: todo.title,
    createdAt: todo.created_at,
    checkedAt: todo.checked_at,
    pinnedAt: todo.pinned_at,
  };
}

function todosTable() {
  return supabase.from<TodoEntity>('todos');
}

function createTodo({ userId, title }: { userId: string; title: string }) {
  return todosTable()
    .insert({ title, user_id: userId })
    .select('id')
    .single()
    .then(handleSingleError(TodoCreate));
}

function deleteTodo({ userId, id }: { userId: string; id: string }) {
  return todosTable()
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
  return todosTable()
    .update({ checked_at: checked ? now() : null })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single()
    .then(handleSingleError(TodoSetChecked));
}

function setTodoPinned({ userId, id }: { userId: string; id: string }) {
  return todosTable()
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
  return todosTable()
    .update({ title })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single()
    .then(handleSingleError(TodoSetTitle));
}

function deleteAccount({ userId }: { userId: string }) {
  return todosTable()
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
  timezone?: string;
}> {
  const { data: todos } = await todosTable()
    .select('id,title,created_at,checked_at,pinned_at')
    .eq('user_id', userId)
    .or(`checked_at.gte.${startOfDay(timezone)},checked_at.is.null`);

  if (todos) {
    return { todos: todos.map(toJSON), timezone };
  }
  return { todos: [], timezone };
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
  const { data: tasks } = await todosTable()
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
): ({ data, error }: PostgrestSingleResponse<TodoEntity>) => Response {
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
