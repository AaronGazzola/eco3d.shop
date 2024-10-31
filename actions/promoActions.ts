"use server";
import getActionResponse from "@/actions/getActionResponse";
import { getUserRoleAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";
import { PromoCodeWithPromoKey } from "@/types/db.types";

export const getPromoCodesWithKeysAction = async (): Promise<
  ActionResponse<PromoCodeWithPromoKey[]>
> => {
  try {
    const supabase = getSupabaseServerActionClient();
    const { data: userRoleData, error: userRollError } =
      await getUserRoleAction();
    if (userRollError) throw new Error(userRollError);
    if (userRoleData?.role !== "admin") throw new Error("User is not an admin");
    const { data: promoCodes, error: promoError } = await supabase
      .from("promo_codes")
      .select(`*, promo_key:promo_keys (*)`);
    if (promoError) throw new Error(promoError.message);
    return getActionResponse({ data: promoCodes });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export type CreatePromoCodeAndKeyValues = {
  code: string;
  key: string;
  discountPercentage: number;
  expirationDate: string;
};

export const createPromoCodeAndKeyAction = async (
  input: CreatePromoCodeAndKeyValues
) => {
  try {
    const supabase = getSupabaseServerActionClient();

    const { data: userRoleData, error: userRoleError } =
      await getUserRoleAction();
    if (userRoleError) throw new Error(userRoleError);
    if (userRoleData?.role !== "admin") throw new Error("User is not an admin");

    const { data: promoKeyData, error: promoKeyError } = await supabase
      .from("promo_keys")
      .insert({ item_code: input.key })
      .select("*")
      .single();
    if (promoKeyError) throw new Error(promoKeyError.message);

    const { data: promoCodeData, error: promoCodeError } = await supabase
      .from("promo_codes")
      .insert({
        promo_code: input.code,
        promo_key_id: promoKeyData.id,
        percentage_discount: input.discountPercentage,
        expiration_date: input.expirationDate,
      })
      .select("*")
      .single();
    if (promoCodeError) throw new Error(promoCodeError.message);

    return getActionResponse({
      data: {
        ...promoCodeData,
        promo_key: promoKeyData,
      },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export type UpdatePromoCodeAndKeyValues = {
  id: string;
  code?: string;
  key?: string;
  discountPercentage?: number;
  expirationDate?: string;
};

export const updatePromoCodeAndKeyAction = async (
  input: UpdatePromoCodeAndKeyValues
) => {
  try {
    const supabase = getSupabaseServerActionClient();
    const { data: userRoleData, error: userRoleError } =
      await getUserRoleAction();
    if (userRoleError) throw new Error(userRoleError);
    if (userRoleData?.role !== "admin") throw new Error("User is not an admin");

    const { data: promoCodeData, error: promoCodeError } = await supabase
      .from("promo_codes")
      .update({
        ...(input.code && { promo_code: input.code }),
        ...(input.discountPercentage && {
          percentage_discount: input.discountPercentage,
        }),
        ...(input.expirationDate && { expiration_date: input.expirationDate }),
      })
      .eq("id", input.id)
      .select("*, promo_key:promo_keys (*)")
      .single();
    if (promoCodeError) throw new Error(promoCodeError.message);
    let promoKeyData = null;
    if (input.key) {
      const { data, error: promoKeyError } = await supabase
        .from("promo_keys")
        .update({ item_code: input.key })
        .eq("id", promoCodeData.promo_key_id ?? "")
        .select("*")
        .single();
      if (promoKeyError) throw new Error(promoKeyError.message);
      promoKeyData = data;
    }

    return getActionResponse({
      data: {
        ...promoCodeData,
        ...(promoKeyData && { promo_key: promoKeyData }),
      },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const deletePromoCodeAction = async (id: string) => {
  try {
    const supabase = getSupabaseServerActionClient();
    const { data: userRoleData, error: userRoleError } =
      await getUserRoleAction();
    if (userRoleError) throw new Error(userRoleError);
    if (userRoleData?.role !== "admin") throw new Error("User is not an admin");

    const { data: promoCodeData, error: promoCodeError } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", id)
      .select("*")
      .single();
    if (promoCodeError) throw new Error(promoCodeError.message);

    const { data: promoKeyData, error: promoKeyError } = await supabase
      .from("promo_keys")
      .delete()
      .eq("id", promoCodeData.promo_key_id ?? "")
      .select("*")
      .single();
    if (promoKeyError) throw new Error(promoKeyError.message);

    return getActionResponse({
      data: { ...promoCodeData, promo_key: promoKeyData },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getPromoCodeByItemCodeAction = async (
  itemCode: string
): Promise<ActionResponse<PromoCodeWithPromoKey>> => {
  try {
    const supabase = getSupabaseServerActionClient();

    const { data: promoKey, error: promoKeyError } = await supabase
      .from("promo_keys")
      .select("id")
      .eq("item_code", itemCode)
      .single();

    if (promoKeyError || !promoKey)
      throw new Error(promoKeyError?.message || "Promo key not found");

    const { data: promoCode, error: promoCodeError } = await supabase
      .from("promo_codes")
      .update({ is_seen: true })
      .eq("promo_key_id", promoKey.id)
      .select("*, promo_key:promo_keys!inner(*)")
      .single();

    if (promoCodeError) throw new Error(promoCodeError.message);

    return getActionResponse({ data: promoCode });
  } catch (error) {
    return getActionResponse({ error });
  }
};
