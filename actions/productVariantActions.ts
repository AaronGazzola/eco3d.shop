"use server";
import getActionResponse from "@/actions/getActionResponse";
import { getUserAction, getUserIsAdminAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";
import { ProductVariant } from "@/types/db.types";

// Fetch product variants by product ID
export const getProductVariantsAction = async (
  productId: string,
): Promise<ActionResponse<ProductVariant[]>> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: user, error } = await getUserAction();
    if (!user) throw new Error("Please sign in to view product variants");

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);

    if (variantsError) throw new Error(variantsError.message);

    return getActionResponse({ data: variants });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Create a new product variant
export type CreateProductVariantValues = {
  variant_name: string;
  product_id: string;
  stock_quantity?: number;
  custom_attributes?: Record<string, any>;
  estimated_print_seconds?: number;
};

export const createProductVariantAction = async (
  input: CreateProductVariantValues,
) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: variantData, error: variantError } = await supabase
      .from("product_variants")
      .insert({
        variant_name: input.variant_name,
        product_id: input.product_id,
        stock_quantity: input.stock_quantity ?? 0,
        custom_attributes: input.custom_attributes ?? {},
        estimated_print_seconds: input.estimated_print_seconds ?? null,
      })
      .select("*")
      .single();

    if (variantError) throw new Error(variantError.message);

    return getActionResponse({ data: variantData });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Update a product variant
export const updateProductVariantAction = async (
  input: Partial<ProductVariant> & { id: string },
) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: updatedVariant, error: updateError } = await supabase
      .from("product_variants")
      .update(input)
      .eq("id", input.id)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);

    return getActionResponse({ data: updatedVariant });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Delete a product variant
export const deleteProductVariantAction = async (id: string) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: deletedVariant, error: deleteError } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", id)
      .select("*")
      .single();

    if (deleteError) throw new Error(deleteError.message);

    return getActionResponse({ data: deletedVariant });
  } catch (error) {
    return getActionResponse({ error });
  }
};
