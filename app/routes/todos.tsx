import type { LoaderFunction, ActionFunction, MetaFunction } from 'remix';
import { useEffect, useRef, ReactNode, useCallback, memo } from 'react';
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

import {
  Todo,
  TodoCreate,
  TodoDelete,
  TodoSetPinned,
  TodoSetChecked,
  TodoSetTitle,
  LoaderData,
} from '~/models/todos';
import { useRouteData, useCommand, useEditable } from '~/hooks/todos';
import {
  nbsp,
  isBackspaceKey,
  isEnterKey,
  isEscapeKey,
  cursorAtStart,
  cursorAtEnd,
  todayDate,
  maxDate,
  formatTimeAgo,
} from '~/utils';
import { getTodos, executeCommand } from '~/db.server';
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

export default function TodosRoute() {
  const {
    onDeckTodos,
    onDeckTodosCount,
    looseEndTodos,
    looseEndTodosCount,
    timezone,
  } = useRouteData();
  const editable = useEditable();
  const command = useCommand({
    onSuccess: (data) => {
      if (data.command == TodoCreate) {
        editable(data.data.id).setEditing(true);
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
              onCreate={onCreate}
              {...todo}
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
                timezone={timezone}
                {...todo}
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
    id,
    timezone,
    onCreate,
    isEditing,
    setEditing,
    ...todo
  }: Todo & {
    timezone?: string;
    onCreate?: () => void;
    isEditing: boolean;
    setEditing: (isEditing: boolean) => void;
  }) => {
    const focusRef = useRef<HTMLInputElement>(null);
    const command = useCommand();

    const onSetTitle = useDebouncedCallback(
      (title: string) => command(TodoSetTitle, { id, title }),
      400
    );
    const onDelete = () => command(TodoDelete, { id });
    const onPin = () => command(TodoSetPinned, { id });
    const onToggleChecked = (checked: boolean) =>
      command(TodoSetChecked, { id, checked: String(checked) });
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
              {onCreate ? null : (
                <span className="text-xs">
                  {' '}
                  {nbsp(
                    formatTimeAgo(
                      maxDate(todo.createdAt, todo.pinnedAt),
                      timezone
                    )
                  )}
                </span>
              )}
            </label>
          )}
        </div>
        <div className="ml-3 flex items-center">
          <TodoMenu
            id={id}
            onDelete={onDelete}
            onEdit={onEdit}
            onPin={onCreate ? undefined : onPin}
          />
        </div>
      </li>
    );
  }
);

function TodoMenuItem({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <MenuItem onSelect={onSelect} className="doodle rounded-md">
      <span className="group flex items-center p-1 w-full border">
        {children}
      </span>
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
      <MenuList>
        <TodoMenuItem onSelect={onEdit}>
          <PencilAltIcon
            className="mr-3 h-5 w-5 group-hover:text-gray-500"
            aria-hidden="true"
          />
          Edit
        </TodoMenuItem>
        {onPin ? (
          <TodoMenuItem onSelect={onPin}>
            <StarIcon
              className="mr-3 h-5 w-5 group-hover:text-gray-500"
              aria-hidden="true"
            />
            Pin
          </TodoMenuItem>
        ) : null}
        <TodoMenuItem onSelect={onDelete}>
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
