"use client";
import {
  CreateProductVariantValues,
  createProductVariantAction,
  deleteAllVariantImagesAction,
  deleteProductVariantAction,
  deleteVariantImageAction,
  getProductVariantsAction,
  updateProductVariantAction,
  uploadVariantImageAction,
} from "@/actions/productVariantActions";
import { useToastQueue } from "@/hooks/useToastQueue";
import {
  HookOptions,
  ProductVariant,
  ProductVariantWithImages,
} from "@/types/db.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

enum DefaultMessages {
  SuccessMessage = "Operation successful",
  ErrorMessage = "Operation failed",
}

export const useGetProductVariants = (productId: string) => {
  return useQuery<ProductVariantWithImages[] | null, Error>({
    queryKey: ["product_variants", productId],
    queryFn: async () => {
      if (!productId)
        throw new Error("Product ID is required to fetch variants");
      const { data, error } = await getProductVariantsAction(productId);
      console.log(data, error);
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

export const useUploadVariantImage = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async ({
      file,
      variantId,
    }: {
      file: File;
      variantId: string;
    }) => {
      const { data, error } = await uploadVariantImageAction(file, variantId);
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
        queryKey: ["product_variants", data?.product_variant_id],
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || "Image uploaded successfully",
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

export const useDeleteVariantImage = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  type ImageData = {
    id: string;
    product_variant_id: string;
    image_path: string;
  };

  return useMutation<ImageData, Error, string>({
    mutationFn: async (imageId: string) => {
      const { data, error } = await deleteVariantImageAction(imageId);
      if (error) throw new Error(error);
      return data as ImageData;
    },
    onError: error => {
      toast({
        title: error.message || errorMessage || DefaultMessages.ErrorMessage,
        open: true,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants", data.product_variant_id],
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || "Image deleted successfully",
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

export const useDeleteAllVariantImages = ({
  errorMessage,
  successMessage,
}: HookOptions<ProductVariant, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (variantId: string) => {
      const { data, error } = await deleteAllVariantImagesAction(variantId);
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
        queryKey: ["product_variants"],
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || "All images deleted successfully",
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};
