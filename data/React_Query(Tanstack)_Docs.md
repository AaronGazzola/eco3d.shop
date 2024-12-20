# TanStack Query Documentation

## useQuery Hook

### Return Values

- `data`: The last successfully resolved data for the query
- `dataUpdatedAt`: Timestamp when query returned "success" status
- `error`: Error object if query threw error, null otherwise
- `errorUpdatedAt`: Timestamp when query returned "error" status
- `failureCount`: Number of consecutive failures
- `failureReason`: Error that caused retry
- `fetchStatus`: 'fetching' | 'paused' | 'idle'
- `isError`: Boolean indicating error state
- `isFetched`: Boolean indicating if query has been fetched
- `isFetchedAfterMount`: Boolean indicating post-mount fetch
- `isFetching`: Boolean indicating active fetch
- `isInitialLoading`: Deprecated alias for isLoading
- `isLoading`: Boolean for first fetch in flight
- `isLoadingError`: Boolean for error during first fetch
- `isPaused`: Boolean indicating paused state
- `isPending`: Boolean indicating pending state
- `isPlaceholderData`: Boolean indicating placeholder data
- `isRefetchError`: Boolean for error during refetch
- `isRefetching`: Boolean for background refetch
- `isStale`: Boolean for invalidated/stale data
- `isSuccess`: Boolean indicating success state
- `promise`: Stable promise resolving to query data
- `refetch`: Function to manually refetch query
- `status`: 'pending' | 'error' | 'success'

### Options

```typescript
{
  queryKey: unknown[],
  queryFn: (context: QueryFunctionContext) => Promise<TData>,
  enabled?: boolean,
  networkMode?: 'online' | 'always' | 'offlineFirst',
  retry?: boolean | number | (failureCount: number, error: TError) => boolean,
  retryOnMount?: boolean,
  retryDelay?: number | (retryAttempt: number, error: TError) => number,
  staleTime?: number | ((query: Query) => number),
  gcTime?: number | Infinity,
  queryKeyHashFn?: (queryKey: QueryKey) => string,
  refetchInterval?: number | false | ((query: Query) => number | false | undefined),
  refetchIntervalInBackground?: boolean,
  refetchOnMount?: boolean | "always" | ((query: Query) => boolean | "always"),
  refetchOnWindowFocus?: boolean | "always" | ((query: Query) => boolean | "always"),
  refetchOnReconnect?: boolean | "always" | ((query: Query) => boolean | "always"),
  notifyOnChangeProps?: string[] | "all" | (() => string[] | "all" | undefined),
  select?: (data: TData) => unknown,
  initialData?: TData | () => TData,
  initialDataUpdatedAt?: number | (() => number | undefined),
  placeholderData?: TData | (previousValue: TData | undefined, previousQuery: Query | undefined) => TData,
  structuralSharing?: boolean | ((oldData: unknown | undefined, newData: unknown) => unknown),
  throwOnError?: boolean | (error: TError, query: Query) => boolean,
  meta?: Record<string, unknown>
}
```

## useMutation Hook

### Return Values

- `data`: Last successfully resolved data
- `error`: Error object if mutation failed
- `failureCount`: Number of consecutive failures
- `failureReason`: Error that caused retry
- `isError`: Boolean indicating error state
- `isIdle`: Boolean indicating idle state
- `isPending`: Boolean indicating pending state
- `isPaused`: Boolean indicating paused state
- `isSuccess`: Boolean indicating success state
- `mutate`: Function to trigger mutation
- `mutateAsync`: Promise-based mutation trigger
- `reset`: Function to reset mutation state
- `status`: 'idle' | 'pending' | 'error' | 'success'
- `submittedAt`: Timestamp of submission
- `variables`: Variables passed to mutation

### Options

```typescript
{
  mutationFn: (variables: TVariables) => Promise<TData>,
  gcTime?: number | Infinity,
  meta?: Record<string, unknown>,
  mutationKey?: unknown[],
  networkMode?: 'online' | 'always' | 'offlineFirst',
  onError?: (error: TError, variables: TVariables, context: TContext) => Promise<unknown> | unknown,
  onMutate?: (variables: TVariables) => Promise<TContext | void> | TContext | void,
  onSettled?: (data: TData, error: TError, variables: TVariables, context?: TContext) => Promise<unknown> | unknown,
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => Promise<unknown> | unknown,
  retry?: boolean | number | (failureCount: number, error: TError) => boolean,
  retryDelay?: number | (retryAttempt: number, error: TError) => number,
  scope?: { id: string },
  throwOnError?: boolean | (error: TError) => boolean
}
```

### Mutation Function

```typescript
mutate(variables, {
  onError?: (error: TError, variables: TVariables, context: TContext) => void,
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined) => void,
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void
})
```
