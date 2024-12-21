"use server";

import getActionResponse from "@/actions/getActionResponse";
import { getUserAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import OrderConfirmationEmail from "@/components/emails/OrderConfirmationEmail";
import { QueueItem, calculateQueueTimes } from "@/lib/q.util";
import { ActionResponse } from "@/types/action.types";
import { CartItem } from "@/types/cart.types";
import { Database } from "@/types/database.types";
import { ProductVariant } from "@/types/db.types";
import { Order, OrderStatus } from "@/types/order.types";
import { render } from "@react-email/render";
import sendEmailAction from "./emailActions";

const getMostRecent = (items: { updated_at: string }[]) => {
  if (!items.length) return null;

  return items.reduce((latest, current) => {
    if (!latest.updated_at) return current;
    if (!current.updated_at) return latest;
    return new Date(current.updated_at) > new Date(latest.updated_at)
      ? current
      : latest;
  });
};

const determineOrderStatus = (
  order: any,
  queueItems: any[],
  shippingDetail: any,
): OrderStatus => {
  if (order.status === "delivered") return OrderStatus.Delivered;

  const orderQueueItems = queueItems.filter((qi) =>
    order.order_items.some((oi: any) => oi.id === qi.order_item_id),
  );

  if (!orderQueueItems.length) return OrderStatus.Waiting;

  const hasTracking = shippingDetail?.tracking_number;
  const allProcessed = orderQueueItems.every((item) => item.is_processed);

  if (hasTracking && allProcessed) return OrderStatus.Shipped;
  if (allProcessed) return OrderStatus.Packing;

  const isAnyPrinting = orderQueueItems.some(
    (qi) => qi.print_started_seconds && !qi.is_processed,
  );

  return isAnyPrinting ? OrderStatus.Printing : OrderStatus.Waiting;
};

const calculateOrderTimes = (
  orderItems: any[],
  queueItems: any[],
  variants: ProductVariant[],
) => {
  const variantsWithTimes = orderItems
    .map((item) => {
      const variant = variants.find((v) => v.id === item.product_variant_id);
      if (!variant) return null;

      return {
        id: variant.id,
        print_queue_id: variant.print_queue_id,
        estimated_print_seconds: variant.estimated_print_seconds
          ? variant.estimated_print_seconds * item.quantity
          : null,
        variant_name: variant.variant_name,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const relevantQueueItems: QueueItem[] = queueItems.map((qi) => ({
    id: qi.id,
    quantity: qi.quantity,
    product_variant_id: qi.product_variant_id,
    created_seconds: qi.created_seconds,
    print_started_seconds: qi.print_started_seconds,
    is_processed: qi.is_processed,
    print_queue_id: qi.print_queue_id,
    order_item_id: qi.order_item_id,
    updated_at: qi.updated_at,
    product_variants: qi.product_variant_id
      ? {
          estimated_print_seconds:
            variants.find((v) => v.id === qi.product_variant_id)
              ?.estimated_print_seconds ?? null,
        }
      : null,
  }));

  return calculateQueueTimes(variantsWithTimes, relevantQueueItems);
};

const transformOrderData = (
  order: any,
  queueItems: any[],
  variants: ProductVariant[],
): Order => {
  const latestShippingDetail = getMostRecent(order.shipping_details) as any as {
    tracking_number: string;
  };
  const status = determineOrderStatus(order, queueItems, latestShippingDetail);

  const times = calculateOrderTimes(order.order_items, queueItems, variants);

  return {
    id: order.id,
    status,
    isRefund: order.status === "refunded",
    startTime: order.created_at ? new Date(order.created_at) : undefined,
    trackingNumber: latestShippingDetail?.tracking_number,
    recipientName: order.recipient_name || "",
    addressLine1: order.address_line_1,
    addressLine2: order.address_line_2,
    city: order.city,
    state: order.state,
    postalCode: order.postal_code,
    country: order.country,
    totalPrice: order.total_price,
    expectedFulfillmentDate: order.expected_fulfillment_date
      ? new Date(order.expected_fulfillment_date)
      : undefined,
    currency: order.currency,
    createdAt: new Date(order.created_at || Date.now()),
    printTime: times.printTime,
    queueTime: times.qTime,
    items: order.order_items.map((item: any) => ({
      id: Number(item.id),
      name: item.product_variants?.variant_name || "",
      imageUrl:
        item.product_variants?.variant_images?.[0]?.images?.image_path || "",
      size:
        (item.product_variants?.attributes as any)?.size === "sm"
          ? "Small"
          : (item.product_variants?.attributes as any)?.size === "md"
            ? "Medium"
            : "Large",
      colors: ((item.product_variants?.attributes as any)?.color ||
        []) as string[],
      primaryText: (item.product_variants?.attributes as any)?.primary_text,
      secondaryText: (item.product_variants?.attributes as any)?.secondary_text,
      price: item.price_at_order,
      quantity: item.quantity,
    })),
  };
};

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const getUserOrdersAction = async (): Promise<
  ActionResponse<Order[]>
> => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: userData, error: userError } = await getUserAction();

    if (userError) throw new Error(userError);
    if (!userData?.user?.id || !userData.user.email) {
      throw new Error("User ID or email not found");
    }

    const { data: existingProfile, error: profileQueryError } = await supabase
      .from("profiles")
      .select()
      .or(`user_id.eq.${userData.user.id},email.eq.${userData.user.email}`)
      .maybeSingle();

    let profileData: Profile;

    if (!existingProfile) {
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          user_id: userData.user.id,
          email: userData.user.email,
        })
        .select()
        .single();

      if (createError) {
        const { data: retryProfile, error: retryError } = await supabase
          .from("profiles")
          .select()
          .eq("email", userData.user.email)
          .single();

        if (retryError || !retryProfile) {
          throw new Error(
            `Failed to get or create profile: ${createError.message}`,
          );
        }

        profileData = retryProfile;
      } else if (!newProfile) {
        throw new Error("Failed to create profile: No data returned");
      } else {
        profileData = newProfile;
      }
    } else {
      if (!existingProfile.user_id) {
        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({ user_id: userData.user.id })
          .eq("email", userData.user.email)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }
        profileData = updatedProfile;
      } else {
        profileData = existingProfile;
      }
    }

    if (!profileData?.id) {
      throw new Error("Profile ID not found after get/create operation");
    }

    const [ordersResponse, queueItemsResponse, variantsResponse] =
      await Promise.all([
        supabase
          .from("orders")
          .select(
            `
          *,
          shipping_details!left(
            id,
            shipping_provider,
            tracking_number,
            shipping_status,
            estimated_delivery
          ),
          order_items(
            *,
            product_variants(
              *,
              variant_images(
                *,
                images(*)
              )
            )
          ),
          refunds(*)
        `,
          )
          .eq("profile_id", profileData.id),
        supabase.from("print_queue_items").select("*"),
        supabase.from("product_variants").select("*"),
      ]);

    if (ordersResponse.error) throw ordersResponse.error;
    if (queueItemsResponse.error) throw queueItemsResponse.error;
    if (variantsResponse.error) throw variantsResponse.error;

    const transformedOrders = ordersResponse.data.map((order) =>
      transformOrderData(order, queueItemsResponse.data, variantsResponse.data),
    );

    return getActionResponse({ data: transformedOrders });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getAdminOrdersAction = async (): Promise<
  ActionResponse<(Order & { userEmail?: string })[]>
> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: userData, error: userError } = await getUserAction();
    if (userError) throw new Error(userError);
    if (!userData?.user) throw new Error("User not found");

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) throw new Error("Unauthorized: Admin access required");

    const [ordersResponse, queueItemsResponse, variantsResponse] =
      await Promise.all([
        supabase.from("orders").select(`
         *,
         shipping_details!left(
           id,
           shipping_provider,
           tracking_number,
           shipping_status,
           estimated_delivery
         ),
         order_items(
           *,
           product_variants(
             *,
             variant_images(
               *,
               images(*)
             )
           )
         ),
         refunds(*),
         profiles(*)
       `),
        supabase.from("print_queue_items").select("*"),
        supabase.from("product_variants").select("*"),
      ]);

    if (ordersResponse.error) throw ordersResponse.error;
    if (queueItemsResponse.error) throw queueItemsResponse.error;
    if (variantsResponse.error) throw variantsResponse.error;

    const transformedOrders = ordersResponse.data.map((order) => ({
      ...transformOrderData(
        order,
        queueItemsResponse.data,
        variantsResponse.data,
      ),
      userEmail: order.profiles?.email,
    }));

    return getActionResponse({ data: transformedOrders });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateOrderTrackingAction = async (
  orderId: string,
  trackingNumber: string,
): Promise<ActionResponse<boolean>> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: userData, error: userError } = await getUserAction();

    if (userError) throw new Error(userError);
    if (!userData?.user) throw new Error("User not found");

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) throw new Error("Unauthorized: Admin access required");

    const { data: existingShipping, error: fetchError } = await supabase
      .from("shipping_details")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

    if (existingShipping) {
      const { error: updateError } = await supabase
        .from("shipping_details")
        .update({
          tracking_number: trackingNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingShipping.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("shipping_details")
        .insert({
          order_id: orderId,
          tracking_number: trackingNumber,
          shipping_provider: "default",
          shipping_status: "pending",
        });

      if (insertError) throw insertError;
    }

    return getActionResponse({ data: true });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export async function sendOrderConfirmation(
  email: string,
  orderId: string,
  items: CartItem[],
  total: number,
) {
  const html = await render(
    <OrderConfirmationEmail orderId={orderId} items={items} total={total} />,
  );

  return sendEmailAction({
    email,
    subject: `Order Confirmed - #${orderId}`,
    content: html,
  });
}
