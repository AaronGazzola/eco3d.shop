"use client";
import { User } from "@supabase/supabase-js";
import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import useSupabase from "@/hooks/useSupabase";
import useNotification from "@/hooks/useNotification";
import { NotificationStyle, Notifications } from "@/types/notification.types";

interface AuthContextProps {
  user: User | null;
  signInWithMagicLink: (email: string) => void;
  signOut: () => void;
  isPending: boolean;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const AuthContext = createContext<AuthContextProps | null>(null);

const AuthClientProvider = ({
  children,
  user: userProp,
}: {
  children: ReactNode;
  user: User | null;
}) => {
  const [user, setUser] = useState<User | null>(userProp);
  const supabase = useSupabase();
  const queryClient = new QueryClient();
  const { showNotification } = useNotification();

  const signInMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      showNotification({
        message: Notifications.SignInSuccess,
        style: NotificationStyle.Success,
      });
    },
    onError: (error) => {
      showNotification({
        message: error.message,
        style: NotificationStyle.Error,
      });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setUser(null);
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      showNotification({
        message: Notifications.SignOutSuccess,
        style: NotificationStyle.Success,
      });
    },
    onError: (error) => {
      showNotification({
        message: error.message,
        style: NotificationStyle.Error,
      });
    },
  });

  const {
    data: queryData,
    error,
    isError,
  } = useQuery({
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw new Error(error.message);
      if (data) setUser(data.user);
      return data.user;
    },

    queryKey: ["auth-user"],
    initialData: userProp,
  });

  useEffect(() => {
    if (isError || error) {
      showNotification({
        message: error.message || Notifications.GetUserError,
        style: NotificationStyle.Error,
      });
    }
  }, [isError, error]);

  useEffect(() => {
    const listener = supabase.auth.onAuthStateChange((state, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.data.subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: queryData,
          signInWithMagicLink: (email: string) => signInMutation.mutate(email),
          signOut: () => signOutMutation.mutate(),
          isPending: signInMutation.isPending || signOutMutation.isPending,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

export default AuthClientProvider;
