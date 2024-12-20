"use server";

import getActionResponse from "@/actions/getActionResponse";
import { getUserAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";
import { ProductVariant } from "@/types/db.types";
import { ItemTime, Order, OrderStatus } from "@/types/order.types";

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
  order: any,
  queueItems: any[],
  variants: ProductVariant[],
) => {
  const orderItemTimes: ItemTime[] = order.order_items.map((item: any) => {
    const variant = variants.find((v) => v.id === item.product_variant_id);
    if (!variant?.print_queue_id || !variant.estimated_print_seconds) {
      return { printTime: 0, queueTime: 0 };
    }

    const itemQueueItems = queueItems.filter(
      (qi) => qi.order_item_id === item.id,
    );
    const queueItemsAhead = queueItems.filter(
      (qi) =>
        qi.print_queue_id === variant.print_queue_id &&
        new Date(qi.created_at) <
          new Date(itemQueueItems[0]?.created_at || Date.now()),
    );

    const queueTime = queueItemsAhead.reduce((total, qi) => {
      const qiVariant = variants.find((v) => v.id === qi.product_variant_id);
      return total + (qiVariant?.estimated_print_seconds || 0) * qi.quantity;
    }, 0);

    const printTime =
      queueTime + variant.estimated_print_seconds * item.quantity;

    return { printTime, queueTime };
  });

  return {
    printTime: Math.max(...orderItemTimes.map((t: ItemTime) => t.printTime)),
    queueTime: Math.max(...orderItemTimes.map((t: ItemTime) => t.queueTime)),
  };
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

  const times = calculateOrderTimes(order, queueItems, variants);

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
    queueTime: times.queueTime,
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

export const getUserOrdersAction = async (): Promise<
  ActionResponse<Order[]>
> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: userData, error: userError } = await getUserAction();
    if (userError) throw new Error(userError);
    if (!userData?.user) throw new Error("User not found");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select()
      .eq("user_id", userData.user.id)
      .single();
    if (profileError) throw new Error(profileError.message);

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

    const { data: existingShipping } = await supabase
      .from("shipping_details")
      .select("*")
      .eq("order_id", orderId)
      .order("updated_at", { ascending: false });

    const latestShippingDetail = existingShipping?.[0];
    if (!latestShippingDetail) throw new Error("No shipping details found");

    const { error: updateError } = await supabase
      .from("shipping_details")
      .update({
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", latestShippingDetail.id);

    if (updateError) throw updateError;
    return getActionResponse({ data: true });
  } catch (error) {
    return getActionResponse({ error });
  }
};
