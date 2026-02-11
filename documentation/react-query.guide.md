# TanStack Query (React Query) Guide

Comprehensive reference for TanStack Query v5 with Next.js 15.

## Installation

```bash
npm install @tanstack/react-query
```

## Setup

Wrap your app with QueryClientProvider:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## useQuery

Fetch and cache data with automatic refetching and caching.

### Required Parameters

**queryKey** (`unknown[]`)

- Unique identifier for the query
- Changes trigger automatic refetch (unless disabled)
- Must be an array: `['todos']`, `['todo', id]`

**queryFn** (`(context: QueryFunctionContext) => Promise<TData>`)

- Function that fetches data
- Must return a promise
- Receives query context with signal for cancellation

### Key Optional Parameters

**enabled** (`boolean | (query: Query) => boolean`)

- Default: `true`
- Set `false` to prevent automatic execution
- Useful for dependent queries

**staleTime** (`number | Infinity | ((query: Query) => number)`)

- Default: `0`
- Time in ms before data is considered stale
- Use `Infinity` to never mark stale

**gcTime** (`number | Infinity`)

- Default: `5 minutes`
- Time before inactive cache data is garbage collected
- Previously called `cacheTime` in v4

**refetchOnMount** (`boolean | "always"`)

- Default: `true`
- Refetch on component mount if data is stale

**refetchOnWindowFocus** (`boolean | "always"`)

- Default: `true`
- Refetch when window regains focus if data is stale

**refetchOnReconnect** (`boolean | "always"`)

- Default: `true`
- Refetch when network reconnects if data is stale

**refetchInterval** (`number | false | ((query: Query) => number | false)`)

- Default: `false`
- Interval in ms for polling

**refetchIntervalInBackground** (`boolean`)

- Default: `false`
- Continue refetch interval when window loses focus

**retry** (`boolean | number | (failureCount: number, error: TError) => boolean`)

- Default: `3` (client), `0` (server)
- Number of retry attempts or function to determine retry

**retryDelay** (`number | (retryAttempt: number, error: TError) => number`)

- Default: exponential backoff
- Delay between retry attempts

**select** (`(data: TData) => unknown`)

- Transform or select part of data
- Does not affect cached data

**placeholderData** (`TData | (previousValue, previousQuery) => TData`)

- Display temporary data while loading
- Does not persist to cache

**initialData** (`TData | () => TData`)

- Initial cache value
- Persists to cache

**throwOnError** (`boolean | (error: TError, query: Query) => boolean`)

- Default: `false`
- Propagate errors to error boundary

**networkMode** (`'online' | 'always' | 'offlineFirst'`)

- Default: `'online'`
- Controls network behavior

**meta** (`Record<string, unknown>`)

- Store arbitrary metadata

### Return Values

**status** (`'pending' | 'error' | 'success'`)

- Current query state

**isPending**, **isError**, **isSuccess** (`boolean`)

- Derived boolean states

**data** (`TData | undefined`)

- Query result data

**error** (`TError | null`)

- Error object if query failed

**refetch** (`() => Promise<QueryObserverResult>`)

- Manually trigger refetch

**isFetching** (`boolean`)

- True when query is fetching

**isStale** (`boolean`)

- True when data is stale

**failureCount** (`number`)

- Number of failed attempts

### Usage Example

```typescript
import { useQuery } from "@tanstack/react-query";

function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!userId,
  });
}
```

---

## useMutation

Perform create, update, or delete operations.

### Configuration Parameters

**mutationFn** (`(variables: TVariables) => Promise<TData>`)

- Required
- Async function that performs mutation
- Receives variables passed to `mutate()`

**gcTime** (`number | Infinity`)

- Default: varies (max ~24 days)
- Time before inactive mutation is garbage collected

**mutationKey** (`unknown[]`)

- Optional unique key for mutation
- Used for inheriting defaults

**networkMode** (`'online' | 'always' | 'offlineFirst'`)

- Default: `'online'`

**retry** (`boolean | number | (failureCount: number, error: TError) => boolean`)

- Default: `0`
- Retry failed mutations

**retryDelay** (`number | (retryAttempt: number, error: TError) => number`)

- Delay between retries

**throwOnError** (`boolean | (error: TError) => boolean`)

- Default: `false`
- Propagate errors to error boundary

**meta** (`Record<string, unknown>`)

- Store arbitrary metadata

### Lifecycle Callbacks

**onMutate** (`(variables: TVariables) => Promise<TContext> | TContext`)

- Fires before mutation executes
- Return value passed to other callbacks as `context`
- Use for optimistic updates

**onSuccess** (`(data: TData, variables: TVariables, context: TContext) => Promise<void> | void`)

- Fires on successful completion
- Receives result data

**onError** (`(error: TError, variables: TVariables, context: TContext) => Promise<void> | void`)

- Fires when mutation fails
- Use to rollback optimistic updates

**onSettled** (`(data: TData | undefined, error: TError | null, variables: TVariables, context: TContext) => Promise<void> | void`)

- Fires after success or error
- Useful for cleanup or invalidation

### Return Values

**status** (`'idle' | 'pending' | 'error' | 'success'`)

- Current mutation state

**isIdle**, **isPending**, **isError**, **isSuccess**, **isPaused** (`boolean`)

- Derived boolean states

**data** (`TData | undefined`)

- Last successful result

**error** (`TError | null`)

- Error object if mutation failed

**variables** (`TVariables | undefined`)

- Current mutation variables

**mutate** (`(variables: TVariables, options?) => void`)

- Trigger mutation (fire and forget)

**mutateAsync** (`(variables: TVariables, options?) => Promise<TData>`)

- Trigger mutation (returns promise)

**reset** (`() => void`)

- Clear mutation state

**failureCount** (`number`)

- Number of failed attempts

**submittedAt** (`number`)

- Timestamp of submission

### Usage Example

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: PostInsert) => {
      const response = await fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify(post),
      });
      if (!response.ok) throw new Error("Failed to create post");
      return response.json();
    },
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
```

---

## useQueryClient

Access QueryClient instance for cache manipulation.

### Getting QueryClient

```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
```

### Key Methods

**invalidateQueries** (`(filters?, options?) => Promise<void>`)

- Mark queries as invalid and refetch active ones
- Options:
  - `refetchType: 'active' | 'inactive' | 'all' | 'none'` (default: `'active'`)
  - `cancelRefetch: boolean`

```typescript
queryClient.invalidateQueries({ queryKey: ["posts"] });
queryClient.invalidateQueries({
  queryKey: ["posts"],
  refetchType: "all",
});
```

**refetchQueries** (`(filters?, options?) => Promise<void>`)

- Force refetch queries regardless of state
- Options:
  - `cancelRefetch: boolean` (default: `true`)
  - `throwOnError: boolean`

```typescript
queryClient.refetchQueries({ queryKey: ["posts", postId] });
```

**cancelQueries** (`(filters?) => Promise<void>`)

- Cancel outgoing query requests
- Useful before optimistic updates

```typescript
await queryClient.cancelQueries({ queryKey: ["todos", id] });
```

**getQueryData** (`<TData>(queryKey: QueryKey) => TData | undefined`)

- Synchronously get cached data
- Returns `undefined` if not found

```typescript
const post = queryClient.getQueryData(["post", postId]);
```

**setQueryData** (`<TData>(queryKey: QueryKey, updater: TData | ((old: TData | undefined) => TData)) => TData | undefined`)

- Synchronously update cached data
- Creates cache entry if doesn't exist

```typescript
queryClient.setQueryData(["post", postId], (old) => ({
  ...old,
  title: "Updated Title",
}));
```

**removeQueries** (`(filters?) => void`)

- Remove queries from cache

```typescript
queryClient.removeQueries({ queryKey: ["posts"] });
```

**resetQueries** (`(filters?) => Promise<void>`)

- Reset queries to initial state

```typescript
queryClient.resetQueries({ queryKey: ["posts"] });
```

---

## Optimistic Updates

Update UI immediately before server confirms, rollback on error.

### Pattern with onMutate

```typescript
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ["todos", newTodo.id] });

    const previousTodo = queryClient.getQueryData(["todos", newTodo.id]);

    queryClient.setQueryData(["todos", newTodo.id], newTodo);

    return { previousTodo };
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(["todos", newTodo.id], context.previousTodo);
  },
  onSettled: (newTodo) => {
    queryClient.invalidateQueries({ queryKey: ["todos", newTodo?.id] });
  },
});
```

### Steps

1. **Cancel outgoing queries** - Prevent race conditions
2. **Snapshot previous data** - Save for rollback
3. **Optimistically update cache** - Show new data immediately
4. **Return context** - Pass snapshot to error handler
5. **Rollback on error** - Restore previous data
6. **Invalidate on settled** - Refetch to sync with server

---

## Dependent Queries

Wait for data before executing query.

```typescript
const { data: user } = useQuery({
  queryKey: ["user"],
  queryFn: fetchUser,
});

const { data: posts } = useQuery({
  queryKey: ["posts", user?.id],
  queryFn: () => fetchUserPosts(user.id),
  enabled: !!user?.id,
});
```

---

## Updating Cache from Mutations

### Using onSuccess

```typescript
const { mutate } = useMutation({
  mutationFn: createPost,
  onSuccess: (newPost) => {
    queryClient.setQueryData(["posts", newPost.id], newPost);
  },
});
```

### Using invalidateQueries

```typescript
const { mutate } = useMutation({
  mutationFn: updatePost,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  },
});
```

---

## Integration with Zustand

Update Zustand stores in query callbacks:

```typescript
export function usePosts() {
  const setPosts = usePostsStore((state) => state.setPosts);

  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const posts = await fetchPosts();
      setPosts(posts);
      return posts;
    },
  });
}
```

---

## Key Differences from v4

- `cacheTime` renamed to `gcTime`
- `useQuery` suspense via `useSuspenseQuery` hook
- `getQueryData` no longer accepts filters parameter
- Improved TypeScript inference
- Callbacks receive consistent parameter order

---

## References

- [Official Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [useQuery Reference](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery)
- [useMutation Reference](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation)
- [QueryClient Reference](https://tanstack.com/query/latest/docs/reference/QueryClient)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Query Invalidation Guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- Template files: `/documentation/template_files/template.hooks.tsx`
