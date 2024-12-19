// actions/paymentActions.ts
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

export async function handlePaymentSuccess(
  paymentIntentId: string,
  items: CartItem[],
) {
  console.log("Starting payment success handler:", { paymentIntentId, items });
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: user, error: userError } = await getUserAction();
    console.log("User data:", { user, userError });

    if (!user) throw new Error("User not found");

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Payment intent retrieved:", paymentIntent);

    if (paymentIntent.status !== "succeeded") {
      console.error("Payment intent not succeeded:", paymentIntent.status);
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

    console.log("Products lookup:", { products, productsError });
    if (productsError) throw productsError;

    console.log("Product variants:", products.product_variants);

    const variantId = products.product_variants.find(
      (v) =>
        JSON.stringify(v.attributes) ===
        JSON.stringify({ size: items[0].size, colors: items[0].colors }),
    )?.id;

    if (!variantId) throw new Error("Product variant not found");

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.user.id,
        status: "payment_received",
        total_price: Math.round(paymentIntent.amount),
        currency: paymentIntent.currency.toUpperCase(),
        address_line_1: "Pending",
        city: "Pending",
        state: "Pending",
        postal_code: "0000",
        country: "Pending",
      })
      .select()
      .single();

    console.log("Order creation result:", { order, orderError });
    if (orderError) throw orderError;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_variant_id: variantId,
      quantity: item.quantity,
      price_at_order: Math.round(item.price * 100),
      status: "payment_received" as Database["public"]["Enums"]["order_status"],
    }));
    console.log("Order items prepared:", orderItems);

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    console.log("Order items insertion result:", { itemsError });
    if (itemsError) throw itemsError;

    return { orderId: order.id };
  } catch (error) {
    console.error("Payment processing failed:", error);
    throw new Error("Failed to process order");
  }
}
