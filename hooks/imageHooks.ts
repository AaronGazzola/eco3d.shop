"use client";

import {
  createVariantImageAction,
  deleteAllVariantImagesAction,
  deleteVariantImageAction,
  updateImageOrderAction,
} from "@/actions/imageActions";
import { DefaultMessages } from "@/hooks/productVariantHooks";
import useSupabase from "@/hooks/useSupabase";
import { useToastQueue } from "@/hooks/useToastQueue";
import { HookOptions, ProductVariant } from "@/types/db.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateImageOrder = (productId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async ({
      imageId,
      newOrder,
      variantId,
    }: {
      imageId: string;
      newOrder: number;
      variantId: string;
    }) => {
      const { data, error } = await updateImageOrderAction(
        imageId,
        newOrder,
        variantId,
      );
      if (error) throw new Error(error);
      return data;
    },
    onError: error => {
      toast({
        title: "Failed to update image order",
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants", productId],
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
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async ({
      file,
      variantId,
    }: {
      file: File;
      variantId: string;
    }) => {
      const path = `product-variants/${variantId}/${file.name}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("product-images")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { error: dbError, data } = await createVariantImageAction(
        variantId,
        path,
      );
      if (dbError) throw dbError;
      return data;
    },
    onError: error => {
      toast({
        title: error.message || errorMessage || "Failed to upload image",
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants"],
      });
      toast({
        title: successMessage || "Image uploaded successfully",
      });
    },
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
        queryKey: ["product_variants"],
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
