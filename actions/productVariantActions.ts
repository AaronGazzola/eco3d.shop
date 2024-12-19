"use server";
import getActionResponse from "@/actions/getActionResponse";
import { getUserIsAdminAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";
import { CartItem } from "@/types/cart.types";
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

    existingVariants.forEach((variant) => {
      if (variant.attributes && typeof variant.attributes === "object") {
        Object.entries(variant.attributes as Record<string, unknown>).forEach(
          ([key, value]) => {
            if (!allAttributes[key]) {
              allAttributes[key] = {
                values: new Set(),
                isMulti: Array.isArray(value),
              };
            }
            if (Array.isArray(value)) {
              value.forEach((v) => allAttributes[key].values.add(v.toString()));
            } else if (value) {
              allAttributes[key].values.add(value.toString());
            }
          },
        );
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
            return valueArray.map((value) => ({
              [key]: isMulti ? [value] : value,
            }));
          }
          return acc.flatMap((combo) =>
            valueArray.map((value) => ({
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
        variantCombinations.map((combo) => ({
          product_id: productId,
          variant_name: Object.entries(combo)
            .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(",") : v}`)
            .join("-"),
          attributes: combo as Json,
          stock_quantity: 0,
        })),
      );

    if (insertError) throw new Error(insertError.message);

    return getActionResponse({ data: null });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Fetch product variants by product ID
// productVariantActions.ts - update only the getProductVariantsAction
export const getProductVariantsAction = async (
  productId?: string | null,
): Promise<ActionResponse<ProductVariantWithImages[] | null>> => {
  if (!productId) throw new Error("Product ID is required to fetch variants");

  try {
    const supabase = await getSupabaseServerActionClient();

    const { data, error } = await supabase
      .from("product_variants")
      .select(
        `
        *,
        variant_images (
          *,
          images (*)
        )
      `,
      )
      .eq("product_id", productId)
      .order("variant_name");

    if (error) throw new Error(error.message);
    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Create a new product variant
export type CreateProductVariantValues = {
  variant_name: string;
  product_id: string;
  stock_quantity?: number;
  attributes?: Record<string, any>;
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
        attributes: input.attributes ?? {},
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

const transformSize = (size: string): "sm" | "md" | "lg" => {
  const sizeMap: Record<string, "sm" | "md" | "lg"> = {
    Small: "sm",
    Medium: "md",
    Large: "lg",
  };
  return sizeMap[size] || "md";
};

export const getCartTimeAction = async (
  items: CartItem[],
): Promise<ActionResponse<{ printTime: number; qTime: number }>> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("*");
    if (error) throw error;
    if (!variants)
      return getActionResponse({ data: { printTime: 0, qTime: 0 } });

    const totalPrintTime = items.reduce((acc, item) => {
      const variantAttributes = {
        size: transformSize(item.size),
        color: item.colors?.map((c) => c.toLowerCase()),
      };
      const matchingVariant = variants.find((variant: ProductVariant) => {
        const attrs = variant.attributes as { size: string; color: string[] };
        return (
          attrs.size === variantAttributes.size &&
          JSON.stringify(attrs.color?.sort()) ===
            JSON.stringify(variantAttributes.color?.sort())
        );
      });
      if (matchingVariant?.estimated_print_seconds) {
        return acc + matchingVariant.estimated_print_seconds * item.quantity;
      }
      return acc;
    }, 0);

    const queueIds = [
      ...new Set(
        variants.filter((v) => v.print_queue_id).map((v) => v.print_queue_id),
      ),
    ];

    const { data: queueItems, error: queueError } = await supabase
      .from("print_queue_items")
      .select("*, product_variant_id(*)")
      .in("print_queue_id", queueIds)
      .eq("is_processed", false);

    if (queueError) throw queueError;

    const queueTimes = queueIds.map((queueId) => {
      return (
        queueItems
          ?.filter((item) => item.print_queue_id === queueId)
          .reduce((acc, item) => {
            const variant = item.product_variant_id as any as ProductVariant;
            return acc + (variant.estimated_print_seconds || 0) * item.quantity;
          }, 0) || 0
      );
    });

    const maxQueueTime = Math.max(...queueTimes, 0);

    return getActionResponse({
      data: {
        printTime: totalPrintTime,
        qTime: maxQueueTime,
      },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};
