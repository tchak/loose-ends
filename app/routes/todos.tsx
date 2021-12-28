import type { LoaderFunction, ActionFunction, MetaFunction } from 'remix';
import { useLoaderData, useFetcher } from 'remix';
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
  classNames,
  cursorAtStart,
  cursorAtEnd,
  todayDate,
  maxDate,
  isPresent,
  formatTimeAgo,
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

type LoaderData = { todos: Todo[]; looseEnds: Todo[]; timezone?: string };

export default function TodosRoute() {
  const { todos, looseEnds, timezone } = useLoaderData<LoaderData>();
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
            <span className="sr-only">Add New Task</span>
          </button>
        </div>
      </div>

      <SkipNavContent />

      {isPresent(todos) ? (
        <ul role="list" className="doodle-border text-base md:text-xl">
          {todos.map((todo) => (
            <TaskItem
              key={todo.id}
              onCreate={onCreate}
              {...editable(todo.id)}
              {...todo}
            />
          ))}
        </ul>
      ) : null}

      {isPresent(looseEnds) ? (
        <>
          <div className="flex items-center px-0 py-6">
            <h2 className="flex-grow">
              <span className="font-medium">Loose ends</span>
            </h2>

            <div className="flex items-center h-10"></div>
          </div>

          <ul role="list" className="doodle-border text-base md:text-xl">
            {looseEnds.map((todo) => (
              <TaskItem
                key={todo.id}
                timezone={timezone}
                {...editable(todo.id)}
                {...todo}
              />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

const TaskItem = memo(
  ({
    id,
    title,
    checked,
    createdAt,
    pinnedAt,
    timezone,
    onCreate,
    isEditing,
    setEditing,
  }: Todo & {
    timezone?: string;
    onCreate?: () => void;
    isEditing: boolean;
    setEditing: (isEditing: boolean) => void;
  }) => {
    const focusRef = useRef<HTMLInputElement>(null);
    const { fetcher, command } = useCommand();

    const onSetTitle = useDebouncedCallback(
      (title: string) => command(TodoSetTitle, { id, title }),
      400
    );
    const onDelete = () => command(TodoDelete, { id });
    const onPin = () => command(TodoSetPinned, { id });
    const onToggleChecked = (checked: boolean) =>
      command(TodoSetChecked, { id, checked: String(checked) });
    const onEdit = () => setEditing(true);

    const isDeleted =
      (fetcher.type == 'actionSubmission' || fetcher.type == 'actionReload') &&
      fetcher.submission.formData.get('command') == TodoDelete;

    useEffect(() => {
      if (isEditing) {
        requestAnimationFrame(() => {
          focusRef.current?.focus();
        });
      }
    }, [isEditing]);

    return (
      <li
        className={classNames(
          'relative flex items-center px-4 py-2 md:py-4',
          isDeleted ? 'hidden' : ''
        )}
      >
        <div className="flex items-center h-10">
          <input
            type="checkbox"
            className="rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
            defaultChecked={checked}
            onChange={({ currentTarget: { checked } }) =>
              onToggleChecked(checked)
            }
            title={title || 'A new task'}
          />
        </div>
        <div className="ml-3 flex flex-grow items-center h-10">
          {isEditing ? (
            <input
              ref={focusRef}
              className="w-full h-full focus:outline-none"
              type="text"
              defaultValue={title}
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
              {title}
              {!onCreate ? (
                <>
                  {' '}
                  <span className="text-xs">
                    {nbsp(
                      formatTimeAgo(maxDate(createdAt, pinnedAt), timezone)
                    )}
                  </span>
                </>
              ) : null}
            </label>
          )}
        </div>
        <div className="ml-3 flex items-center">
          <TaskMenu
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

function TaskMenuItem({
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
        className={classNames('group flex items-center p-1 w-full')}
        onClick={onClick}
      >
        {children}
      </button>
    </MenuItem>
  );
}

function TaskMenu({
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
        <span className="sr-only">Task Menu</span>
      </MenuButton>
      <MenuList className="">
        <TaskMenuItem onClick={onEdit}>
          <PencilAltIcon
            className="mr-3 h-5 w-5 group-hover:text-gray-500"
            aria-hidden="true"
          />
          Edit
        </TaskMenuItem>
        {onPin ? (
          <TaskMenuItem onClick={onPin}>
            <StarIcon
              className="mr-3 h-5 w-5 group-hover:text-gray-500"
              aria-hidden="true"
            />
            Pin
          </TaskMenuItem>
        ) : null}
        <TaskMenuItem onClick={onDelete}>
          <TrashIcon
            className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500"
            aria-hidden="true"
          />
          Delete
        </TaskMenuItem>
      </MenuList>
    </Menu>
  );
}
