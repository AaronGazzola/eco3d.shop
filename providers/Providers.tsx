import ProgressProvider from "@/providers/ProgressProvider";
import SuspendedSearchParamsProvider from "@/providers/SearchParamsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ReactNode } from "react";
import AuthProvider from "@/providers/AuthServerProvider";
import { ZIndexProvider } from "@/providers/ZIndexProvider";
import QueryProvider from "@/providers/QueryProvider";

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
