"use client"; // context/SearchParamsContext.tsx
import { createContext, useContext, ReactNode, FC, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface SearchParamsContextProps {
  searchParams: URLSearchParams | null;
}

const SearchParamsContext = createContext<SearchParamsContextProps | undefined>(
  undefined,
);

const SearchParamsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();

  return (
    <SearchParamsContext.Provider value={{ searchParams }}>
      {children}
    </SearchParamsContext.Provider>
  );
};

export const useSearchParamsContext = (): SearchParamsContextProps => {
  const context = useContext(SearchParamsContext);
  if (context === undefined) {
    throw new Error(
      "useSearchParamsContext must be used within a SearchParamsProvider",
    );
  }
  return context;
};

const SuspendedSearchParamsProvider: FC<{ children: ReactNode }> = ({
  children,
}) => (
  <Suspense fallback={null}>
    <SearchParamsProvider>{children}</SearchParamsProvider>
  </Suspense>
);

export default SuspendedSearchParamsProvider;
