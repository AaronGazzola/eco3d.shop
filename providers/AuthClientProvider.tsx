"use client";
import useSupabase from "@/hooks/useSupabase";
import { useQueryClient } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      queryClient.setQueryData(["user"], session?.user ?? null);

      if (event === "SIGNED_IN") {
        queryClient.invalidateQueries({ queryKey: ["userRole"] });
      }
    });
  }, [queryClient, supabase]);

  return <>{children}</>;
};

export default AuthProvider;
