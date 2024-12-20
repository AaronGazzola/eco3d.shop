"use server";

import getSupabaseServerActionClient from "@/clients/action-client";
import { CartItem } from "@/types/cart.types";
import { Database } from "@/types/database.types";
import Stripe from "stripe";
import { getUserAction } from "./userActions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
  appInfo: {
    name: "Eco3D.Shop",
  },
});

export async function createPaymentIntent(amount: number) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "aud",
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    throw new Error("Failed to create payment intent");
  }
}

function normalizeSize(size: string): string {
  const sizeMap: Record<string, string> = {
    Small: "sm",
    Medium: "md",
    Large: "lg",
  };
  return sizeMap[size] || size.toLowerCase();
}

async function getQueueIdsByColor() {
  const supabase = await getSupabaseServerActionClient();
  const { data: queues, error } = await supabase
    .from("print_queues")
    .select("id")
    .limit(2);

  if (error || !queues || queues.length < 2) {
    throw new Error("Failed to fetch print queues");
  }

  return {
    whiteQueueId: queues[0].id,
    colorQueueId: queues[1].id,
  };
}

export async function handlePaymentSuccess(
  paymentIntentId: string,
  items: CartItem[],
  email: string,
) {
  const supabase = await getSupabaseServerActionClient();
  const { data: userData } = await getUserAction();
  const { whiteQueueId, colorQueueId } = await getQueueIdsByColor();

  let profileId: string;
  if (userData?.user) {
    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({ user_id: userData.user.id, email })
        .select()
        .single();

      if (profileError) throw profileError;
      profileId = newProfile.id;
    }
  } else {
    const { data: guestProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({ email })
      .select()
      .single();

    if (profileError) throw profileError;
    profileId = guestProfile.id;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
    });

    if (signInError) throw signInError;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment not successful");
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      product_variants (
        id,
        variant_name,
        attributes
      )
    `,
    )
    .eq("name", "Model V8")
    .single();
  if (productsError) throw productsError;

  const orderResult = await supabase
    .from("orders")
    .insert({
      profile_id: profileId,
      status: "payment_received",
      total_price: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      address_line_1: "Pending",
      city: "Pending",
      state: "Pending",
      postal_code: "0000",
      country: "Pending",
    })
    .select()
    .single();
  if (orderResult.error) throw orderResult.error;

  const orderItems = await Promise.all(
    items.map(async (item) => {
      const normalizedSize = normalizeSize(item.size);
      const variant = products.product_variants.find((v) => {
        const attrs = v.attributes as { size: string; color: string[] };
        const hasMatchingSize = attrs.size === normalizedSize;
        const hasMatchingColors = item.colors?.every((color) =>
          attrs.color.includes(color.toLowerCase()),
        );
        return hasMatchingSize && hasMatchingColors;
      });

      if (!variant) {
        throw new Error(`Variant not found for size ${item.size}`);
      }

      return {
        order_id: orderResult.data.id,
        product_variant_id: variant.id,
        quantity: item.quantity,
        price_at_order: Math.round(item.price * 100),
        status:
          "payment_received" as Database["public"]["Enums"]["order_status"],
      };
    }),
  );

  const { data: insertedOrderItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems)
    .select();
  if (itemsError) throw itemsError;

  const printQueueItems = insertedOrderItems.map((orderItem) => {
    const variant = products.product_variants.find(
      (v) => v.id === orderItem.product_variant_id,
    );
    const variantAttrs = variant?.attributes as { color: string[] } | undefined;

    const hasWhite = variantAttrs?.color.some(
      (color) => color.toLowerCase() === "white",
    );

    const queueId = hasWhite ? whiteQueueId : colorQueueId;

    return {
      print_queue_id: queueId,
      order_item_id: orderItem.id,
      product_variant_id: orderItem.product_variant_id,
      quantity: orderItem.quantity,
      is_processed: false,
    };
  });

  const { error: queueError } = await supabase
    .from("print_queue_items")
    .insert(printQueueItems);
  if (queueError) throw queueError;

  return { orderId: orderResult.data.id };
}
