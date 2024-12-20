import { CartItem } from "@/types/cart.types";
import { Database } from "@/types/database.types";
import { SupabaseClient } from "@supabase/supabase-js";

export interface QueueItem {
  id: string;
  quantity: number;
  product_variant_id: string | null;
  created_seconds: number;
  print_started_seconds: number | null;
  is_processed: boolean | null;
  print_queue_id: string | null;
}

export interface QueueTime {
  printTime: number;
  qTime: number;
}

export const calculateQueueTimes = (
  variants: {
    id: string;
    print_queue_id: string | null;
    estimated_print_seconds: number | null;
    variant_name: string;
  }[],
  queueItems: QueueItem[],
): QueueTime => {
  const results: QueueTime[] = variants.map((variant) => {
    if (!variant.print_queue_id || !variant.estimated_print_seconds) {
      return { printTime: 0, qTime: 0 };
    }

    const queueItemsAhead = queueItems.filter(
      (qi) =>
        !qi.is_processed &&
        qi.print_queue_id === variant.print_queue_id &&
        qi.created_seconds < Math.floor(Date.now() / 1000),
    );

    const qTime = queueItemsAhead.reduce((total, qi) => {
      const qiVariant = variants.find((v) => v.id === qi.product_variant_id);
      return total + (qiVariant?.estimated_print_seconds || 0);
    }, 0);

    const currentTime = Math.floor(Date.now() / 1000);
    const printingItem = queueItemsAhead.find((qi) => qi.print_started_seconds);
    const elapsedTime = printingItem?.print_started_seconds
      ? currentTime - printingItem.print_started_seconds
      : 0;

    const remainingPrintTime = Math.max(
      0,
      (variants.find((v) => v.id === printingItem?.product_variant_id)
        ?.estimated_print_seconds || 0) - elapsedTime,
    );

    const printTime =
      qTime + variant.estimated_print_seconds + remainingPrintTime;

    return { printTime, qTime };
  });

  return {
    printTime: Math.max(...results.map((t) => t.printTime)),
    qTime: Math.min(...results.map((t) => t.qTime)),
  };
};

const transformSize = (size: string): "sm" | "md" | "lg" => {
  const sizeMap: Record<string, "sm" | "md" | "lg"> = {
    Small: "sm",
    Medium: "md",
    Large: "lg",
  };
  return sizeMap[size] || "md";
};

export const findVariantsForCart = async (
  supabase: SupabaseClient<Database>,
  items: CartItem[],
  productName = "Model V8",
): Promise<ProductVariant[]> => {
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        product_variants (*)
      `,
    )
    .eq("name", productName)
    .single();

  if (error || !products?.product_variants) {
    return [];
  }

  return items.flatMap((item) => {
    const matchingVariant = products.product_variants.find((variant) => {
      const attrs = variant.attributes as { size: string; color: string[] };
      return (
        attrs.size === transformSize(item.size) &&
        JSON.stringify(attrs.color?.sort()) ===
          JSON.stringify(item.colors?.map((c) => c.toLowerCase())?.sort())
      );
    });

    return matchingVariant ? Array(item.quantity).fill(matchingVariant) : [];
  });
};

type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];

export const calculatePrintTimes = async (
  supabase: SupabaseClient<Database>,
  variants: ProductVariant[],
) => {
  const queueIds = [
    ...new Set(variants.map((v) => v.print_queue_id).filter(Boolean)),
  ];

  if (queueIds.length === 0) {
    return { printTime: 0, qTime: 0 };
  }

  const { data: queueItems, error } = await supabase
    .from("print_queue_items")
    .select(
      `
        quantity,
        product_variant_id,
        print_queue_id,
        product_variants!inner (
          estimated_print_seconds
        )
      `,
    )
    .in("print_queue_id", queueIds)
    .eq("is_processed", false)
    .order("created_seconds", { ascending: true });

  if (error || !queueItems) {
    return { printTime: 0, qTime: 0 };
  }

  const queueItemsByQueue = queueItems.reduce(
    (acc, item) => {
      if (!item.print_queue_id) return acc;
      if (!acc[item.print_queue_id]) {
        acc[item.print_queue_id] = [];
      }
      acc[item.print_queue_id].push(item);
      return acc;
    },
    {} as Record<string, typeof queueItems>,
  );

  const queuePrintTimes = Object.entries(queueItemsByQueue).map(
    ([queueId, items]) => {
      const queueTotal = items.reduce((sum, item) => {
        const itemTime =
          item.quantity * (item.product_variants?.estimated_print_seconds || 0);
        return sum + itemTime;
      }, 0);
      return { queueId, totalTime: queueTotal };
    },
  );

  const variantPrintTimes = variants.map((variant) => {
    if (!variant.print_queue_id || !variant.estimated_print_seconds) {
      return 0;
    }

    const queueTime =
      queuePrintTimes.find((q) => q.queueId === variant.print_queue_id)
        ?.totalTime || 0;

    return queueTime + variant.estimated_print_seconds;
  });

  const relevantQueueTimes = queuePrintTimes
    .filter((q) => variants.some((v) => v.print_queue_id === q.queueId))
    .map((q) => q.totalTime);

  const qTime =
    relevantQueueTimes.length > 0 ? Math.min(...relevantQueueTimes) : 0;
  const printTime = Math.max(...variantPrintTimes);

  return { printTime, qTime };
};
