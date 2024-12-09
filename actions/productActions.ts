"use server";
import getActionResponse from "@/actions/getActionResponse";
import { getUserAction, getUserIsAdminAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";
import { Product, ProductWithVariants } from "@/types/db.types";

export const getProductsAction = async (): Promise<
  ActionResponse<ProductWithVariants[]>
> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: user, error } = await getUserAction();
    if (!user) throw new Error("Please sign in to view products");

    const { data: products, error: productsError } = await supabase.from(
      "products",
    ).select(`
        *,
        product_variants (
          *,
          variant_images (
            *,
            images (*)
          )
        )
      `);

    if (productsError) throw new Error(productsError.message);
    return getActionResponse({ data: products });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export type CreateProductValues = {
  name: string;
  description?: string | null;
};

export const createProductAction = async (input: CreateProductValues) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert({
        name: input.name,
        description: input.description,
      })
      .select("*")
      .single();
    if (productError) throw new Error(productError.message);

    return getActionResponse({ data: productData });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateProductAction = async (
  input: Partial<Product> & { id: string },
) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update(input)
      .eq("id", input.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    return getActionResponse({ data: updatedProduct });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const deleteProductAction = async (id: string) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: deletedProduct, error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("*")
      .single();
    if (deleteError) throw new Error(deleteError.message);

    return getActionResponse({ data: deletedProduct });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getProductByIdAction = async (
  id: string,
): Promise<ActionResponse<ProductWithVariants>> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: user, error: userError } = await getUserAction();
    if (!user) throw new Error("Please sign in to view products");

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        *,
        product_variants (
          *,
          variant_images (
            *,
            images (*)
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    if (productError) throw new Error(productError.message);
    return getActionResponse({ data: product });
  } catch (error) {
    return getActionResponse({ error });
  }
};
