"use server";

import { getProfileAction } from "@/actions/profileActions";
import { getUserAction } from "@/actions/userActions";
import QueryProvider from "@/providers/QueryProvider";
import { ReactNode } from "react";

const ServerQueryProvider = async ({ children }: { children: ReactNode }) => {
  const { data: userData } = await getUserAction();
  const { data: profile } = await getProfileAction();

  return (
    <QueryProvider initialCache={{ user: userData?.user, profile }}>
      {children}
    </QueryProvider>
  );
};

export default ServerQueryProvider;
