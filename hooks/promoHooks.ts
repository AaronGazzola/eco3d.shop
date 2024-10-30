"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HookOptions, PromoCodeWithPromoKey } from "@/types/db.types";
import useSupabase from "@/hooks/useSupabase";
import { useToastQueue } from "@/hooks/useToastQueue";
import {
  CreatePromoCodeAndKeyValues,
  UpdatePromoCodeAndKeyValues,
  createPromoCodeAndKeyAction,
  getPromoCodesWithKeysAction,
  updatePromoCodeAndKeyAction,
} from "@/actions/promoActions";

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

  return useMutation<
    PromoCodeWithPromoKey | null,
    Error,
    UpdatePromoCodeAndKeyValues
  >({
    mutationFn: async (updateValues: UpdatePromoCodeAndKeyValues) => {
      const { data, error } = await updatePromoCodeAndKeyAction(updateValues);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
      toast({
        title: "Promo code updated",
        description: "Promo code and key updated successfully",
        open: true,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update promo code",
        description: error.message,
        open: true,
      });
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
  });
};
