"use client";

import useIsMounted from "@/hooks/useIsMounted";
import AuthProvider from "@/providers/AuthClientProvider";
import ProgressProvider from "@/providers/ProgressProvider";
import QueryProvider from "@/providers/QueryProvider";
import SuspendedSearchParamsProvider from "@/providers/SearchParamsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ZIndexProvider } from "@/providers/ZIndexProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";

const Providers = ({ children }: { children: ReactNode }) => {
  const isMounted = useIsMounted();
  if (!isMounted) return null;
  return (
    <NuqsAdapter>
      <QueryProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ZIndexProvider>
            <ProgressProvider>
              <AuthProvider>
                <SuspendedSearchParamsProvider>
                  {children}
                </SuspendedSearchParamsProvider>
              </AuthProvider>
            </ProgressProvider>
          </ZIndexProvider>
        </ThemeProvider>
      </QueryProvider>
    </NuqsAdapter>
  );
};

export default Providers;
