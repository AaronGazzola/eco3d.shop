"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Params = Record<string, string | null>;

const useUpdateSearchParams = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  return useCallback(
    (newParams: Params, navPath?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });

      if (navPath) return void router.push(`${navPath}?${params}`);
      void router.replace(`${pathname}?${params}`);
    },
    [searchParams, pathname, router],
  );
};

export default useUpdateSearchParams;
