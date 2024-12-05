"use server";
import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";

export const updateImageOrderAction = async (
  imageId: string,
  newOrder: number,
  variantId: string,
) => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: currentImage } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (!currentImage) throw new Error("Image not found");

    const { data, error } = await supabase.rpc("reorder_images", {
      p_image_id: imageId,
      p_new_order: newOrder,
      p_variant_id: variantId,
    });
    console.log(data, error);

    const { data: updatedImage } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .single();

    console.log(currentImage.display_order, updatedImage?.display_order);

    return getActionResponse({ data: null });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const deleteVariantImageAction = async (imageId: string) => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: image, error: fetchError } = await supabase
      .from("images")
      .select("image_path")
      .eq("id", imageId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const fullPath = image.image_path;

    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove([fullPath]);
    if (storageError) throw new Error(storageError.message);

    const { error: dbError } = await supabase
      .from("images")
      .delete()
      .eq("id", imageId)
      .select()
      .single();
    if (dbError) throw new Error(dbError.message);

    return getActionResponse({ data: image });
  } catch (error) {
    console.error("Delete variant image action error:", error);
    return getActionResponse({ error });
  }
};

export const deleteAllVariantImagesAction = async (variantId: string) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: images } = await supabase
      .from("images")
      .select("image_path")
      .eq("product_variant_id", variantId);

    if (images?.length) {
      const { error: storageError } = await supabase.storage
        .from("product-images")
        .remove(images.map(img => img.image_path));
      if (storageError) throw new Error(storageError.message);
    }

    const { data, error: dbError } = await supabase
      .from("images")
      .delete()
      .eq("product_variant_id", variantId)
      .select();
    if (dbError) throw new Error(dbError.message);

    return getActionResponse({ data });
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

    const { data: maxOrderImage } = await supabase
      .from("images")
      .select("display_order")
      .eq("product_variant_id", variantId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderImage?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("images")
      .insert({
        product_variant_id: variantId,
        image_path: imagePath,
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
