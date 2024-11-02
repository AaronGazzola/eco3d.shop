"use client";
import useSupabase from "@/hooks/useSupabase";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";

const AuthClientProvider = ({
  children,
  user,
}: {
  children: ReactNode;
  user?: User | null;
}) => {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      queryClient.setQueryData(["user"], session?.user ?? null);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN")
        queryClient.invalidateQueries({ queryKey: ["userRole"] });
    });
  }, [queryClient, supabase]);

  return <>{children}</>;
};

export default AuthClientProvider;
