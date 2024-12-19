"use server";
import getActionResponse from "@/actions/getActionResponse";
import { getUserAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { Database } from "@/types/database.types";
import { Order, OrderStatus, RefundStatus } from "@/types/order.types";

const dbStatusToOrderStatus = (
  status: Database["public"]["Enums"]["order_status"],
): OrderStatus | RefundStatus => {
  const statusMap: Record<
    Database["public"]["Enums"]["order_status"],
    OrderStatus | RefundStatus
  > = {
    pending: OrderStatus.Waiting,
    in_production: OrderStatus.Printing,
    shipped: OrderStatus.Shipped,
    delivered: OrderStatus.Delivered,
    payment_received: OrderStatus.Waiting,
    refunded: RefundStatus.Processed,
  };
  return statusMap[status];
};

export const getUserOrdersAction = async () => {
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

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
        *,
        shipping_details(*),
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
      .eq("profile_id", profileData.id);

    if (ordersError) throw new Error(ordersError.message);

    const transformedOrders: Order[] = orders.map((order) => ({
      id: order.id,
      status: dbStatusToOrderStatus(order.status),
      isRefund: order.status === "refunded",
      startTime: order.created_at ? new Date(order.created_at) : undefined,
      trackingNumber: order.shipping_details?.[0]?.tracking_number || undefined,
      recipientName: order.recipient_name || "",
      addressLine1: order.address_line_1,
      addressLine2: order.address_line_2 || undefined,
      city: order.city,
      state: order.state,
      postalCode: order.postal_code,
      country: order.country,
      totalPrice: order.total_price,
      expectedFulfillmentDate: order.expected_fulfillment_date
        ? new Date(order.expected_fulfillment_date)
        : undefined,
      currency: order.currency,
      shippingCost: 0,
      createdAt: new Date(order.created_at || Date.now()),
      items: order.order_items.map((item) => ({
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
        price: item.price_at_order,
        quantity: item.quantity,
      })),
    }));

    return getActionResponse({ data: transformedOrders });
  } catch (error) {
    return getActionResponse({ error });
  }
};
