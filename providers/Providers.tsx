import NotificationProvider from "@/providers/NotificationProvider";
import ProgressProvider from "@/providers/ProgressProvider";
import QueryProvider from "@/providers/ServerQueryProvider";
import SuspendedSearchParamsProvider from "@/providers/SearchParamsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ReactNode } from "react";
import AuthProvider from "@/providers/AuthProvider";

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ProgressProvider>
        <NotificationProvider>
          <SuspendedSearchParamsProvider>
            <QueryProvider>
              <AuthProvider>{children}</AuthProvider>
            </QueryProvider>
          </SuspendedSearchParamsProvider>
        </NotificationProvider>
      </ProgressProvider>
    </ThemeProvider>
  );
};

export default Providers;
