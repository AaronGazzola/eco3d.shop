"use client";
import {
  addProductVariantAttributeAction,
  deleteManyProductVariantsAction,
  deleteProductVariantAction,
  getProductVariantsAction,
  updateManyProductVariantsAction,
  updateProductVariantAction,
} from "@/actions/productVariantActions";
import { useToastQueue } from "@/hooks/useToastQueue";
import {
  HookOptions,
  ProductVariant,
  ProductVariantWithImages,
} from "@/types/db.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export enum DefaultMessages {
  SuccessMessage = "Operation successful",
  ErrorMessage = "Operation failed",
}

export const useGetProductVariants = (
  productId?: string | null,
  initialData?: ProductVariantWithImages[] | null,
) => {
  return useQuery<ProductVariantWithImages[] | null, Error>({
    queryKey: ["product_variants", productId],
    queryFn: async () => {
      if (!productId)
        throw new Error("Product ID is required to fetch variants");
      const { data, error } = await getProductVariantsAction(productId);
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!productId,
    initialData,
  });
};

export const useAddProductVariantAttribute = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async ({
      productId,
      attributeName,
      options,
      isMultiValue,
      combinations,
    }: {
      productId: string;
      attributeName: string;
      options: string[];
      isMultiValue?: boolean;
      combinations?: Record<string, unknown>[];
    }) => {
      const { data, error } = await addProductVariantAttributeAction(
        productId,
        attributeName,
        options,
        isMultiValue,
        combinations,
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants", variables.productId],
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: DefaultMessages.SuccessMessage,
      });
    },
  });
};

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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

export const useUpdateManyProductVariants = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async ({
      ids,
      data,
    }: {
      ids: string[];
      data: Partial<Omit<ProductVariant, "id">>;
    }) => {
      const { data: response, error } = await updateManyProductVariantsAction(
        ids,
        data,
      );
      if (error) throw new Error(error);
      return response;
    },
    onError: error => {
      toast({
        title: error.message || errorMessage || DefaultMessages.ErrorMessage,
      });
    },
    onSuccess: data => {
      if (data?.[0]?.product_id) {
        queryClient.invalidateQueries({
          queryKey: ["product_variants", data[0].product_id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || "Variants updated successfully",
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

export const useDeleteManyProductVariants = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) throw new Error("No variants selected");
      const { data, error } = await deleteManyProductVariantsAction(ids);
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
      if (data?.[0]?.product_id) {
        queryClient.invalidateQueries({
          queryKey: ["product_variants", data[0].product_id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || "Variants deleted successfully",
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

export const useDeleteProductVariant = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};
