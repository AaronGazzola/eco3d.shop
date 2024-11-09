"use client";
import {
  CreateProductVariantValues,
  createProductVariantAction,
  deleteProductVariantAction,
  getProductVariantsAction,
  updateProductVariantAction,
} from "@/actions/productVariantActions";
import { useToastQueue } from "@/hooks/useToastQueue";
import { HookOptions, ProductVariant } from "@/types/db.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Enum for default messages
enum DefaultMessages {
  SuccessMessage = "Operation successful",
  ErrorMessage = "Operation failed",
}

// Fetch Product Variants Hook
export const useGetProductVariants = (productId: string) => {
  return useQuery<ProductVariant[] | null, Error>({
    queryKey: ["product_variants", productId],
    queryFn: async () => {
      if (!productId)
        throw new Error("Product ID is required to fetch variants");
      const { data, error } = await getProductVariantsAction(productId);
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Create Product Variant Hook
export const useCreateProductVariant = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (input: CreateProductVariantValues) => {
      if (!input?.variant_name || !input?.product_id)
        throw new Error("Variant name and product ID are required");
      const { data, error } = await createProductVariantAction(input);
      if (error) throw new Error(error);
      return data;
    },
    onError: error => {
      toast({
        title: error.message || errorMessage || DefaultMessages.ErrorMessage,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants", data?.product_id],
      });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

// Update Product Variant Hook
export const useUpdateProductVariant = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async ({ updateData }: HookOptions<ProductVariant>) => {
      if (!updateData || !updateData.id)
        throw new Error("Variant data and ID are required");
      const { data, error } = await updateProductVariantAction(updateData);
      if (error) throw new Error(error);
      return data;
    },
    onError: error => {
      toast({
        title: error.message || errorMessage || DefaultMessages.ErrorMessage,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants", data?.product_id],
      });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

// Delete Product Variant Hook
export const useDeleteProductVariant = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!id) throw new Error("Variant ID is required");
      const { data, error } = await deleteProductVariantAction(id);
      if (error) throw new Error(error);
      return data;
    },
    onError: error => {
      toast({
        title: error.message || errorMessage || DefaultMessages.ErrorMessage,
        open: true,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants", data?.product_id],
      });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};
