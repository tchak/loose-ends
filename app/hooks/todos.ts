import { useLoaderData, useFetcher, useFetchers } from 'remix';
import { useEffect, useCallback, useState } from 'react';
import sortOn from 'sort-on';

import {
  Todo,
  CommandData,
  CommandError,
  CommandResult,
  TodoDelete,
  TodoSetPinned,
  TodoSetChecked,
  TodoSetTitle,
  isRelevantToday,
  isLooseEnd,
  LoaderData,
} from '~/models/todos';
import { isPresent, now } from '~/utils';

export function useRouteData() {
  const fetchers = useFetchers();
  const inflight = fetchers
    .filter(({ type, submission }) => {
      if (type == 'actionSubmission' || type == 'actionReload') {
        switch (submission?.formData.get('command')) {
          case TodoSetChecked:
          case TodoSetPinned:
          case TodoDelete:
          case TodoSetTitle:
            return true;
        }
      }
      return false;
    })
    .map(({ submission }) => submission?.formData)
    .filter(isPresent);
  const { todos, timezone } = useLoaderData<LoaderData>();
  const onDeckTodos = onDeckForToday(todos, inflight, timezone);
  const looseEndTodos = looseEndsForToday(todos, inflight, timezone);

  return {
    timezone,
    onDeckTodos,
    onDeckTodosCount: onDeckTodos.filter(({ hidden }) => !hidden).length,
    looseEndTodos,
    looseEndTodosCount: looseEndTodos.filter(({ hidden }) => !hidden).length,
  };
}

export function useCommand(options?: {
  onSuccess?: (data: CommandData) => void;
  onError?: (error: CommandError) => void;
}) {
  const fetcher = useFetcher<CommandResult>();
  useEffect(() => {
    if (fetcher.type == 'done') {
      if ('data' in fetcher.data && options?.onSuccess) {
        options.onSuccess(fetcher.data);
      } else if ('error' in fetcher.data) {
        console.error(fetcher.data.error);
        if (options?.onError) {
          options.onError(fetcher.data);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.type]);
  return useCallback(
    (command: string, payload?: Record<string, string>) =>
      fetcher.submit(
        {
          command,
          ...payload,
        },
        { method: 'post', replace: true }
      ),
    [fetcher]
  );
}

export function useEditable() {
  const [currentTodoId, setCurrentTodoId] = useState<string | null>(null);
  return useCallback(
    (id: string) => ({
      isEditing: currentTodoId == id,
      setEditing: (isEditing: boolean) =>
        setCurrentTodoId(isEditing ? id : null),
    }),
    [currentTodoId]
  );
}

function onDeckForToday(
  todos: Todo[],
  inflight: FormData[],
  timezone?: string
): Todo[] {
  return sortOn(
    todos.map((todo) => withInflight(todo, inflight)),
    ['-checkedAt', 'pinnedAt', '-createdAt']
  ).map((todo) => {
    if (!todo.hidden) {
      return { ...todo, hidden: !isRelevantToday(todo, timezone) };
    }
    return todo;
  });
}

function looseEndsForToday(
  todos: Todo[],
  inflight: FormData[],
  timezone?: string
): Todo[] {
  return sortOn(
    todos.map((todo) => withInflight(todo, inflight)),
    ['-checkedAt', 'pinnedAt', 'createdAt']
  ).map((todo) => {
    if (!todo.hidden) {
      return { ...todo, hidden: !isLooseEnd(todo, timezone) };
    }
    return todo;
  });
}

function withInflight(todo: Todo, inflight: FormData[]): Todo {
  const formData = inflight.find((formData) => formData.get('id') == todo.id);
  switch (formData?.get('command')) {
    case TodoSetTitle:
      return { ...todo, title: String(formData.get('title')) ?? todo.title };
    case TodoSetChecked:
      if (formData?.get('checked')) {
        return { ...todo, checkedAt: now() };
      }
      return { ...todo, checkedAt: null };
    case TodoSetPinned:
      return { ...todo, pinnedAt: now() };
    case TodoDelete:
      return { ...todo, hidden: true };
    default:
      return todo;
  }
}
