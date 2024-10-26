"use server";

import getSupabaseServerComponentClient from "@/clients/server-component-client";
import AuthClientProvider from "@/providers/AuthClientProvider";
import { ReactNode } from "react";

const AuthServerProvider = async ({ children }: { children: ReactNode }) => {
  const supabase = getSupabaseServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <AuthClientProvider user={user}>{children}</AuthClientProvider>;
};

export default AuthServerProvider;
