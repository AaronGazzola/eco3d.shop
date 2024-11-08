"use client";
import {
  CreatePromoCodeAndKeyValues,
  UpdatePromoCodeAndKeyValues,
  createPromoCodeAndKeyAction,
  deletePromoCodeAction,
  getPromoCodeByItemCodeAction,
  getPromoCodesWithKeysAction,
  updatePromoCodeAndKeyAction,
} from "@/actions/promoActions";
import useSupabase from "@/hooks/useSupabase";
import { useToastQueue } from "@/hooks/useToastQueue";
import { HookOptions, PromoCodeWithPromoKey } from "@/types/db.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// TODO: remove loading state

enum DefaultMessages {
  SuccessMessage = "Profile updated successfully",
  ErrorMessage = "Failed to update profile",
}

export const useGetPromoCodes = ({
  initialData,
}: HookOptions<PromoCodeWithPromoKey[], null> = {}) => {
  const supabase = useSupabase();

  return useQuery<PromoCodeWithPromoKey[] | null, Error>({
    queryKey: ["promoCodes"],
    queryFn: async () => {
      const { data, error } = await getPromoCodesWithKeysAction();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!supabase,
    initialData,
  });
};

export const useCreatePromoCodeAndKey = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation<
    PromoCodeWithPromoKey | null,
    Error,
    CreatePromoCodeAndKeyValues
  >({
    mutationFn: async (createValues: CreatePromoCodeAndKeyValues) => {
      const { data, error } = await createPromoCodeAndKeyAction(createValues);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
      toast({
        title: "Promo code created",
        description: "Promo code and key created successfully",
        open: true,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create promo code",
        description: error.message,
        open: true,
      });
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
  });
};

export const useUpdatePromoCodeAndKey = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();
  const [loading, setloading] = useState(false);

  return {
    ...useMutation<
      PromoCodeWithPromoKey | null,
      Error,
      UpdatePromoCodeAndKeyValues
    >({
      mutationFn: async (updateValues: UpdatePromoCodeAndKeyValues) => {
        setloading(true);
        const { data, error } = await updatePromoCodeAndKeyAction(updateValues);
        if (error) throw new Error(error);
        return data;
      },
      onSuccess: (data) => {
        setloading(false);
        queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
        toast({
          title: "Promo code updated",
          description: "Promo code and key updated successfully",
          open: true,
        });
      },
      onError: (error) => {
        setloading(false);
        toast({
          title: "Failed to update promo code",
          description: error.message,
          open: true,
        });
      },
      retry: 3,
      retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
    }),
    loading,
  };
};

export const useDeletePromoCodeAndKey = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();
  const [loading, setLoading] = useState(false);

  return {
    ...useMutation<PromoCodeWithPromoKey | null, Error, string | undefined>({
      mutationFn: async (id?: string) => {
        setLoading(true);
        if (!id) throw new Error("No promo code id provided");
        const { data, error } = await deletePromoCodeAction(id);
        if (error) throw new Error(error);
        return data;
      },
      onSuccess: () => {
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
        toast({
          title: "Promo code deleted",
          description: "Promo code and key deleted successfully",
          open: true,
        });
      },
      onError: (error) => {
        setLoading(false);
        toast({
          title: "Failed to delete promo code",
          description: error.message,
          open: true,
        });
      },
      retry: 3,
      retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
    }),
    loading,
  };
};

export const useGetPromoCodeByItemCode = () => {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const mutation = useMutation<PromoCodeWithPromoKey | null, Error, string>({
    mutationFn: async (itemCode: string) => {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data, error } = await getPromoCodeByItemCodeAction(itemCode);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data, itemCode) => {
      // Cache the result so that it can be re-used with useQuery
      queryClient.setQueryData(["promoCode", itemCode], data);
    },
    onError: (error) => {
      console.error("Failed to fetch promo code by item code:", error);
    },
  });

  const getCachedPromoCode = (itemCode: string) =>
    queryClient.getQueryData<PromoCodeWithPromoKey>(["promoCode", itemCode]);

  return {
    ...mutation,
    data: getCachedPromoCode(mutation.variables ?? ""),
  };
};
