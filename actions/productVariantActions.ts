"use server";
import getActionResponse from "@/actions/getActionResponse";
import { getUserAction, getUserIsAdminAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";
import { Json } from "@/types/database.types";
import { ProductVariant, ProductVariantWithImages } from "@/types/db.types";

type Attribute = {
  name: string;
  options: string[];
};

export const addProductVariantAttributeAction = async (
  productId: string,
  attributeName: string,
  attributeOptions: string[],
  isMultiValue: boolean = false,
  combinations?: Record<string, unknown>[],
) => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: existingVariants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);

    if (variantsError) throw new Error(variantsError.message);

    // Track both values and type for each attribute
    const allAttributes: Record<
      string,
      { values: Set<string>; isMulti: boolean }
    > = {};

    existingVariants.forEach(variant => {
      if (
        variant.custom_attributes &&
        typeof variant.custom_attributes === "object"
      ) {
        Object.entries(
          variant.custom_attributes as Record<string, unknown>,
        ).forEach(([key, value]) => {
          if (!allAttributes[key]) {
            allAttributes[key] = {
              values: new Set(),
              isMulti: Array.isArray(value),
            };
          }
          if (Array.isArray(value)) {
            value.forEach(v => allAttributes[key].values.add(v.toString()));
          } else if (value) {
            allAttributes[key].values.add(value.toString());
          }
        });
      }
    });

    // Update or add the new attribute
    allAttributes[attributeName] = {
      values: new Set(attributeOptions),
      isMulti: isMultiValue,
    };

    const variantCombinations =
      combinations ||
      Object.entries(allAttributes).reduce<Record<string, unknown>[]>(
        (acc, [key, { values, isMulti }]) => {
          const valueArray = Array.from(values);
          if (acc.length === 0) {
            return valueArray.map(value => ({
              [key]: isMulti ? [value] : value,
            }));
          }
          return acc.flatMap(combo =>
            valueArray.map(value => ({
              ...combo,
              [key]: isMulti ? [value] : value,
            })),
          );
        },
        [],
      );

    const { error: deleteError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);

    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await supabase
      .from("product_variants")
      .insert(
        variantCombinations.map(combo => ({
          product_id: productId,
          variant_name: Object.entries(combo)
            .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(",") : v}`)
            .join("-"),
          custom_attributes: combo as Json,
          stock_quantity: 0,
          attributes: {},
        })),
      );

    if (insertError) throw new Error(insertError.message);

    return getActionResponse({ data: null });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Fetch product variants by product ID
export const getProductVariantsAction = async (
  productId: string,
): Promise<ActionResponse<ProductVariantWithImages[]>> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: user, error } = await getUserAction();
    if (!user) throw new Error("Please sign in to view product variants");

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select(
        `
      *,
      images!product_variant_id(*) 
    `,
      )
      .eq("product_id", productId);

    if (variantsError) throw new Error(variantsError.message);

    // Transform data to ensure images is always an array
    const transformedVariants = variants?.map(variant => ({
      ...variant,
      images: variant.images || [],
    }));

    return getActionResponse({ data: transformedVariants });
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

export const updateManyProductVariantsAction = async (
  ids: string[],
  data: Partial<Omit<ProductVariant, "id">>,
) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: updatedVariants, error: updateError } = await supabase
      .from("product_variants")
      .update(data)
      .in("id", ids)
      .select("*");

    if (updateError) throw new Error(updateError.message);
    return getActionResponse({ data: updatedVariants });
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

export const deleteManyProductVariantsAction = async (ids: string[]) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: isAdmin, error: userRoleError } =
      await getUserIsAdminAction();
    if (userRoleError) throw new Error(userRoleError);
    if (!isAdmin) throw new Error("User is not an admin");

    const { data: deletedVariants, error: deleteError } = await supabase
      .from("product_variants")
      .delete()
      .in("id", ids)
      .select("*");

    if (deleteError) throw new Error(deleteError.message);

    return getActionResponse({ data: deletedVariants });
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
