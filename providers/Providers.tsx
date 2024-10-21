import ProgressProvider from "@/providers/ProgressProvider";
import QueryProvider from "@/providers/ServerQueryProvider";
import SuspendedSearchParamsProvider from "@/providers/SearchParamsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ReactNode } from "react";
import AuthProvider from "@/providers/AuthProvider";
import { ZIndexProvider } from "@/providers/ZIndexProvider";

const Providers = ({ children }: { children: ReactNode }) => {
  return (
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
  );
};

export default Providers;
