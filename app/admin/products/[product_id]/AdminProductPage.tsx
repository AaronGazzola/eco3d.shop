// app/admin/products/[product_id]/ProductClient.tsx
"use client";
import { ProductWithVariants } from "@/types/db.types";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProductVariantTable, variantColumns } from "./ProductVariantTable";

export function AdminProductPage({
  product,
}: {
  product: ProductWithVariants;
}) {
  const router = useRouter();

  return (
    <div className="container py-6 space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Products
      </Button>

      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-muted-foreground">{product.description}</p>

      <Tabs defaultValue="variants">
        <TabsList>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="variants">
          <ProductVariantTable
            columns={variantColumns}
            data={product.product_variants || []}
          />
        </TabsContent>

        <TabsContent value="attributes">
          Attributes content coming soon
        </TabsContent>

        <TabsContent value="images">Images content coming soon</TabsContent>
      </Tabs>
    </div>
  );
}
