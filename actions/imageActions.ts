// imageActions.ts
"use server";
import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";

export const updateImageOrderAction = async (
  variantImageId: string,
  newOrder: number,
  variantId: string,
) => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { error } = await supabase.rpc("reorder_variant_images", {
      p_variant_image_id: variantImageId,
      p_new_order: newOrder,
      p_variant_id: variantId,
    });

    if (error) throw error;
    return getActionResponse({ data: null });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const deleteVariantImageAction = async (imageId: string) => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: image } = await supabase
      .from("images")
      .select("image_path")
      .eq("id", imageId)
      .single();

    if (!image) throw new Error("Image not found");

    await supabase.from("variant_images").delete().eq("image_id", imageId);

    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove([image.image_path]);
    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from("images")
      .delete()
      .eq("id", imageId);
    if (dbError) throw dbError;

    return getActionResponse({ data: image });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const deleteAllVariantImagesAction = async (variantId: string) => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: images } = await supabase
      .from("variant_images")
      .select("images (*)")
      .eq("product_variant_id", variantId);

    if (images?.length) {
      const paths = images.map(vi => vi?.images?.image_path ?? "");
      await supabase.storage.from("product-images").remove(paths);
    }

    await supabase
      .from("variant_images")
      .delete()
      .eq("product_variant_id", variantId);

    return getActionResponse({ data: images });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const createVariantImageAction = async (
  variantId: string,
  imagePath: string,
) => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { error: imageError, data: image } = await supabase
      .from("images")
      .insert({ image_path: imagePath })
      .select()
      .single();

    if (imageError) throw imageError;
    if (!image) throw new Error("Failed to create image");

    const { data: maxOrder } = await supabase
      .from("variant_images")
      .select("display_order")
      .eq("product_variant_id", variantId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("variant_images")
      .insert({
        product_variant_id: variantId,
        image_id: image.id,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};
