"use client";
import { PublishToggle } from "@/app/admin/products/PublishToggle";
import { AttributesTab } from "@/app/admin/products/[product_id]/AttributesTab";
import { ImagesTab } from "@/app/admin/products/[product_id]/ImagesTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetProductById, useUpdateProduct } from "@/hooks/productHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { ProductWithVariants } from "@/types/db.types";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductVariantTable, variantColumns } from "./ProductVariantTable";

export function AdminProductPage({
  product: productProp,
}: {
  product: ProductWithVariants;
}) {
  const { data: product } = useGetProductById(productProp.id, productProp);
  const updateProduct = useUpdateProduct();
  const router = useRouter();
  const { dialog } = useDialogQueue();
  const [slug, setSlug] = useState(product?.slug || "");

  if (!product) return null;

  const handleSaveSlug = () => {
    if (!product) return;
    updateProduct.mutate({
      updateData: {
        id: product.id,
        slug,
      },
    });
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        <div className="flex items-center gap-4">
          <PublishToggle product={product} />
          <span className="text-sm text-muted-foreground">
            {product.published ? "Published" : "Draft"}
          </span>
        </div>
      </div>

      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-muted-foreground">{product.description}</p>

      <div className="flex gap-4 items-center">
        <Input
          value={slug}
          onChange={e => setSlug(e.target.value)}
          placeholder="product-slug"
          className="max-w-md"
        />
        <Button onClick={handleSaveSlug} disabled={updateProduct.isPending}>
          Save Slug
        </Button>
      </div>

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
          <AttributesTab productId={product.id} />
        </TabsContent>

        <TabsContent value="images">
          <ImagesTab productId={product.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
