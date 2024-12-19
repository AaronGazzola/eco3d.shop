"use server";
import getActionResponse from "@/actions/getActionResponse";
import { getUserAction } from "@/actions/userActions";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";
import { Database } from "@/types/database.types";
import { ProductVariant } from "@/types/db.types";
import { Order, OrderStatus, RefundStatus } from "@/types/order.types";

type DbOrderStatus = Database["public"]["Enums"]["order_status"];

const orderStatusToDb: Record<OrderStatus | RefundStatus, DbOrderStatus> = {
  [OrderStatus.Waiting]: "pending",
  [OrderStatus.Printing]: "in_production",
  [OrderStatus.Shipped]: "shipped",
  [OrderStatus.Delivered]: "delivered",
  [RefundStatus.Pending]: "pending",
  [RefundStatus.Processing]: "in_production",
  [RefundStatus.Processed]: "refunded",
};

const dbStatusToOrderStatus = (
  status: DbOrderStatus,
): OrderStatus | RefundStatus => {
  const statusMap: Record<DbOrderStatus, OrderStatus | RefundStatus> = {
    pending: OrderStatus.Waiting,
    in_production: OrderStatus.Printing,
    shipped: OrderStatus.Shipped,
    delivered: OrderStatus.Delivered,
    payment_received: OrderStatus.Waiting,
    refunded: RefundStatus.Processed,
  };
  return statusMap[status];
};

const transformOrderData = (order: any): Order => ({
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
  shippingCost: order.shipping_details?.[0]?.shipping_cost || 0,
  createdAt: new Date(order.created_at || Date.now()),
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
});

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
    const transformedOrders = orders.map(transformOrderData);
    return getActionResponse({ data: transformedOrders });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getAdminOrdersAction = async () => {
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
          refunds(*),
          profiles(*)
        `,
      );

    if (ordersError) throw new Error(ordersError.message);

    const transformedOrders = orders.map((order) => ({
      ...transformOrderData(order),
      userEmail: order.profiles?.email,
    }));

    return getActionResponse({ data: transformedOrders });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateOrderStatusAction = async (
  orderId: string,
  newStatus: OrderStatus | RefundStatus,
) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("role", "admin")
      .single();

    if (!userRole) throw new Error("Unauthorized: Admin access required");

    const dbStatus = orderStatusToDb[newStatus];
    if (!dbStatus) throw new Error("Invalid status");

    const { data, error } = await supabase
      .from("orders")
      .update({ status: dbStatus })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return getActionResponse({ data: transformOrderData(data) });
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

export const getOrderTimeAction = async (
  order: Order,
): Promise<ActionResponse<{ printTime: number; qTime: number }>> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("*");
    if (error) throw error;
    if (!variants)
      return getActionResponse({ data: { printTime: 0, qTime: 0 } });

    const totalPrintTime = order.items.reduce((acc, item) => {
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
