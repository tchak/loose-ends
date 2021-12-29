import type { LoaderFunction, ActionFunction, MetaFunction } from 'remix';
import { useLoaderData, useFetcher, useFetchers } from 'remix';
import {
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
  memo,
} from 'react';
import {
  TrashIcon,
  PencilAltIcon,
  DotsVerticalIcon,
  PlusIcon,
  StarIcon,
} from '@heroicons/react/solid';
import { useDebouncedCallback } from 'use-debounce';
import { Menu, MenuButton, MenuList, MenuItem } from '@reach/menu-button';
import { SkipNavContent } from '@reach/skip-nav';
import sortOn from 'sort-on';

import type { Todo, CommandData, CommandError, CommandResult } from '~/types';
import {
  TodoCreate,
  TodoDelete,
  TodoSetPinned,
  TodoSetChecked,
  TodoSetTitle,
} from '~/types';
import { getTodos, executeCommand } from '~/db.server';
import {
  nbsp,
  isBackspaceKey,
  isEnterKey,
  isEscapeKey,
  cursorAtStart,
  cursorAtEnd,
  todayDate,
  maxDate,
  isPresent,
  formatTimeAgo,
  isToday,
  now,
} from '~/utils';
import { authenticator } from '~/auth.server';

export const loader: LoaderFunction = async ({
  request,
}): Promise<LoaderData> => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/',
  });
  return getTodos({ userId: user.id });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/',
  });
  const formData = await request.formData();
  return executeCommand(formData, { userId: user.id });
};

export const meta: MetaFunction = () => ({ title: 'Loose Ends' });

type LoaderData = { todos: Todo[]; timezone?: string };

export default function TodosRoute() {
  const {
    onDeckTodos,
    onDeckTodosCount,
    looseEndTodos,
    looseEndTodosCount,
    timezone,
  } = useRouteData();
  const [currentTodoId, setCurrentTodoId] = useState<string | null>(null);
  const editable = useCallback(
    (id: string) => ({
      isEditing: currentTodoId == id,
      setEditing: (isEditing: boolean) =>
        setCurrentTodoId(isEditing ? id : null),
    }),
    [currentTodoId]
  );
  const { command } = useCommand({
    onSuccess: (data) => {
      if (data.command == TodoCreate) {
        setCurrentTodoId(data.data.id);
      }
    },
  });
  const onCreate = useCallback(() => command(TodoCreate), [command]);

  return (
    <div role="main">
      <div className="flex items-center px-0 py-6">
        <h1 className="flex-grow">
          <span className="font-medium">{nbsp('Plan your day')}</span>{' '}
          <span className="text-sm">{nbsp(todayDate())}</span>
        </h1>

        <div className="flex items-center">
          <button
            type="button"
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
            onClick={onCreate}
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Add a new Task</span>
          </button>
        </div>
      </div>

      <SkipNavContent />

      {onDeckTodosCount > 0 ? (
        <ul role="list" className="doodle-border text-base md:text-xl">
          {onDeckTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onCreate={onCreate}
              {...editable(todo.id)}
            />
          ))}
        </ul>
      ) : null}

      {looseEndTodosCount > 0 ? (
        <>
          <div className="flex items-center px-0 py-6">
            <h2 className="flex-grow">
              <span className="font-medium">Loose ends</span>
            </h2>

            <div className="flex items-center h-10"></div>
          </div>

          <ul role="list" className="doodle-border text-base md:text-xl">
            {looseEndTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                timezone={timezone}
                {...editable(todo.id)}
              />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

const TodoItem = memo(
  ({
    todo,
    timezone,
    onCreate,
    isEditing,
    setEditing,
  }: {
    todo: Todo;
    timezone?: string;
    onCreate?: () => void;
    isEditing: boolean;
    setEditing: (isEditing: boolean) => void;
  }) => {
    const focusRef = useRef<HTMLInputElement>(null);
    const { command } = useCommand();

    const onSetTitle = useDebouncedCallback(
      (title: string) => command(TodoSetTitle, { id: todo.id, title }),
      400
    );
    const onDelete = () => command(TodoDelete, { id: todo.id });
    const onPin = () => command(TodoSetPinned, { id: todo.id });
    const onToggleChecked = (checked: boolean) =>
      command(TodoSetChecked, { id: todo.id, checked: String(checked) });
    const onEdit = () => setEditing(true);

    useEffect(() => {
      if (isEditing) {
        requestAnimationFrame(() => {
          focusRef.current?.focus();
        });
      }
    }, [isEditing]);

    if (todo.hidden) {
      return <li className="hidden">{todo.title}</li>;
    }

    return (
      <li className="relative flex items-center px-4 py-2 md:py-4">
        <div className="flex items-center h-10">
          <input
            type="checkbox"
            className="rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
            defaultChecked={!!todo.checkedAt}
            onChange={({ currentTarget: { checked } }) =>
              onToggleChecked(checked)
            }
            aria-label={todo.title || 'A new task'}
          />
        </div>
        <div className="ml-3 flex flex-grow items-center h-10">
          {isEditing ? (
            <input
              ref={focusRef}
              className="w-full h-full focus:outline-none"
              type="text"
              defaultValue={todo.title}
              onChange={({ currentTarget: { value } }) => onSetTitle(value)}
              onBlur={() => setEditing(false)}
              onKeyDown={({ nativeEvent, currentTarget }) => {
                if (
                  onCreate &&
                  isEnterKey(nativeEvent) &&
                  cursorAtEnd(currentTarget)
                ) {
                  onCreate();
                } else if (
                  isBackspaceKey(nativeEvent) &&
                  cursorAtStart(currentTarget)
                ) {
                  onDelete();
                } else if (
                  isEscapeKey(nativeEvent) ||
                  isEnterKey(nativeEvent)
                ) {
                  setEditing(false);
                }
              }}
            />
          ) : (
            <label
              className="w-full flex items-center ml-2"
              onDoubleClick={() => setEditing(true)}
            >
              {todo.title}
              {!onCreate ? (
                <>
                  {' '}
                  <span className="text-xs">
                    {nbsp(
                      formatTimeAgo(
                        maxDate(todo.createdAt, todo.pinnedAt),
                        timezone
                      )
                    )}
                  </span>
                </>
              ) : null}
            </label>
          )}
        </div>
        <div className="ml-3 flex items-center">
          <TodoMenu
            id={todo.id}
            onDelete={onDelete}
            onEdit={onEdit}
            onPin={onCreate ? undefined : onPin}
          />
        </div>
      </li>
    );
  }
);

function useCommand(options?: {
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
  const command = useCallback(
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

  return { fetcher, command };
}

function TodoMenuItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <MenuItem onSelect={onClick} className="doodle rounded-md">
      <button
        type="button"
        className="group flex items-center p-1 w-full"
        onClick={onClick}
      >
        {children}
      </button>
    </MenuItem>
  );
}

function TodoMenu({
  id,
  onDelete,
  onEdit,
  onPin,
}: {
  id: string;
  onDelete: () => void;
  onEdit: () => void;
  onPin?: () => void;
}) {
  return (
    <Menu>
      <MenuButton
        id={`menu-${id}`}
        className="rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
      >
        <DotsVerticalIcon className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Todo Menu</span>
      </MenuButton>
      <MenuList className="">
        <TodoMenuItem onClick={onEdit}>
          <PencilAltIcon
            className="mr-3 h-5 w-5 group-hover:text-gray-500"
            aria-hidden="true"
          />
          Edit
        </TodoMenuItem>
        {onPin ? (
          <TodoMenuItem onClick={onPin}>
            <StarIcon
              className="mr-3 h-5 w-5 group-hover:text-gray-500"
              aria-hidden="true"
            />
            Pin
          </TodoMenuItem>
        ) : null}
        <TodoMenuItem onClick={onDelete}>
          <TrashIcon
            className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500"
            aria-hidden="true"
          />
          Delete
        </TodoMenuItem>
      </MenuList>
    </Menu>
  );
}

function useRouteData() {
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

function isRelevantToday(todo: Todo, timezone?: string): boolean {
  return (
    isToday(todo.createdAt, timezone) ||
    (isPinned(todo, timezone) && isUncheckedOrCheckedToday(todo, timezone))
  );
}

function isLooseEnd(todo: Todo, timezone?: string): boolean {
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
