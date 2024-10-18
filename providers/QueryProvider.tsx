"use client";

import { initialQueryCache } from "@/types/db.types";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";

const queryClient = new QueryClient();

const QueryProvider = ({
  children,
  initialCache,
}: {
  children: ReactNode;
  initialCache?: initialQueryCache;
}) => {
  const [init, setInit] = useState(false);
  useEffect(() => {
    if (init || !initialCache) return;
    queryClient.setQueryData(["user"], initialCache.user);
    queryClient.setQueryData(["profile"], initialCache.profile);
    setInit(true);
  }, [init, initialCache]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default QueryProvider;
