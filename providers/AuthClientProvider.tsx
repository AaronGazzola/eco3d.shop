"use client";
import useSupabase from "@/hooks/useSupabase";
import { useQueryClient } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH_EVENT] ${event}`, {
        sessionId: session?.user?.id,
        timestamp: Date.now(),
      });

      queryClient.setQueryData(["user"], session?.user ?? null);
      console.log(`[QUERY_UPDATE] user`, {
        userData: session?.user,
        queryData: queryClient.getQueryData(["user"]),
      });

      if (event === "SIGNED_IN") {
        console.log(`[INVALIDATE] userRole`, {
          event,
          userId: session?.user?.id,
        });
        queryClient.invalidateQueries({ queryKey: ["userRole"] });
      }
    });
  }, [queryClient, supabase]);

  return <>{children}</>;
};

export default AuthProvider;
