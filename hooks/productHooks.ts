"use client";
import {
  CreateProductValues,
  createProductAction,
  deleteProductAction,
  getProductByIdAction,
  getProductsAction,
  updateProductAction,
} from "@/actions/productActions";
import { getUserAction } from "@/actions/userActions";
import { useToastQueue } from "@/hooks/useToastQueue";
import { HookOptions, Product, ProductWithVariants } from "@/types/db.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// TODO: update rather than invalidate cache
// init cache from server provider

enum DefaultMessages {
  SuccessMessage = "Product updated",
  ErrorMessage = "Error updating product",
}

export const useGetProducts = (initialData?: ProductWithVariants[] | null) => {
  return useQuery<ProductWithVariants[] | null, Error>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data: userData, error: userError } = await getUserAction();
      if (userError) throw new Error(userError);
      if (!userData) throw new Error("Please sign in to view products");
      const { data, error } = await getProductsAction();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    initialData,
  });
};

export const useGetProductById = (
  productId: string,
  initialData?: Product | null,
) => {
  return useQuery<ProductWithVariants | null, Error>({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) throw new Error("Product ID is required");
      const { data, error } = await getProductByIdAction(productId);
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    initialData,
  });
};

export const useCreateProduct = ({
  errorMessage,
  successMessage,
}: HookOptions<Product, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (input: CreateProductValues) => {
      if (!input?.name) throw new Error("Product name is required");
      const { data, error } = await createProductAction(input);
      if (error) throw new Error(error);
      return data;
    },
    onError: error => {
      toast({
        title: "Product creation failed",
        description:
          error.message || errorMessage || DefaultMessages.ErrorMessage,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Product created",
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

// Update Product Hook
export const useUpdateProduct = ({
  errorMessage,
  successMessage,
}: HookOptions<Product, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async ({ updateData }: HookOptions<Product>) => {
      if (!updateData) throw new Error("Product data is required");
      const { data, error } = await updateProductAction(updateData);
      if (error) throw new Error(error);
      return data;
    },
    onError: error => {
      toast({
        title: DefaultMessages.ErrorMessage,
        description:
          error.message || errorMessage || DefaultMessages.ErrorMessage,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: successMessage || DefaultMessages.SuccessMessage,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};

// Delete Product Hook
export const useDeleteProduct = ({
  errorMessage,
  successMessage,
}: HookOptions<Product, {}> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!id) throw new Error("Product ID is required");
      const { data, error } = await deleteProductAction(id);
      if (error) throw new Error(error);
      return data;
    },
    onError: error => {
      toast({
        title: "Error deleting product",
        description:
          error.message || errorMessage || DefaultMessages.ErrorMessage,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data?.id] });
      toast({
        title: data?.id,
      });
    },
    retryDelay: attempt => Math.min(attempt * 1000, 3000),
  });
};
