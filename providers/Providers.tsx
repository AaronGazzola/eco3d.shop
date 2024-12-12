import AuthProvider from "@/providers/AuthServerProvider";
import ProgressProvider from "@/providers/ProgressProvider";
import QueryProvider from "@/providers/QueryProvider";
import SuspendedSearchParamsProvider from "@/providers/SearchParamsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ZIndexProvider } from "@/providers/ZIndexProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";

const Providers = ({ children }: { children: ReactNode }) => {
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
              <SuspendedSearchParamsProvider>
                <AuthProvider>{children}</AuthProvider>
              </SuspendedSearchParamsProvider>
            </ProgressProvider>
          </ZIndexProvider>
        </ThemeProvider>
      </QueryProvider>
    </NuqsAdapter>
  );
};

export default Providers;
