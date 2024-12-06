"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteAllVariantImages,
  useDeleteVariantImage,
  useUpdateImageOrder,
  useUploadVariantImage,
} from "@/hooks/imageHooks";
import { useGetProductVariants } from "@/hooks/productVariantHooks";
import { getStorageUrl } from "@/lib/util/storage.util";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

export function ImagesTab({ productId }: { productId: string }) {
  const { data: variants } = useGetProductVariants(productId);
  const uploadImage = useUploadVariantImage();
  const deleteImage = useDeleteVariantImage();
  const deleteAllImages = useDeleteAllVariantImages();
  const updateOrder = useUpdateImageOrder(productId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string>();
  const [deleteVariantId, setDeleteVariantId] = useState<string>();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const setFileInputRef =
    (variantId: string) => (el: HTMLInputElement | null) => {
      fileInputRefs.current[variantId] = el;
    };

  const handleFileUpload = async (variantId: string, files: FileList) => {
    for (const file of files) {
      await uploadImage.mutateAsync({ file, variantId });
    }
  };

  const handleDeleteImage = async () => {
    try {
      if (deleteVariantId) {
        await deleteAllImages.mutateAsync(deleteVariantId);
      } else if (deleteImageId) {
        await deleteImage.mutateAsync(deleteImageId);
      }
    } finally {
      setDeleteDialogOpen(false);
      setDeleteImageId(undefined);
      setDeleteVariantId(undefined);
    }
  };

  const handleReorder = async (
    imageId: string,
    direction: "left" | "right",
    currentOrder: number,
    variantId: string,
  ) => {
    const newOrder =
      direction === "left" ? (currentOrder || 1) - 1 : currentOrder + 1;
    await updateOrder.mutateAsync({ imageId, newOrder, variantId });
  };

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {variants?.map(variant => (
        <Card key={variant.id} className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {variant.variant_name}
              </h3>
              <div className="space-y-1">
                {Object.entries(variant.custom_attributes || {}).map(
                  ([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{key}:</span>{" "}
                      {String(value)}
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRefs.current[variant.id]?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Images
              </Button>
              <input
                type="file"
                ref={setFileInputRef(variant.id)}
                className="hidden"
                multiple
                accept="image/*"
                onChange={e => {
                  if (e.target.files) {
                    handleFileUpload(variant.id, e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteVariantId(variant.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {variant.images?.length ? (
              variant.images
                .sort((a, b) => a.display_order - b.display_order)
                .map(image => (
                  <div key={image.id} className="relative group">
                    <div className="w-32 h-32 relative rounded-lg overflow-hidden">
                      <Image
                        src={getStorageUrl(image.image_path)}
                        alt={variant.variant_name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute left-0 right-1 top-1 flex gap-1 justify-around">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:disabled:opacity-50 disabled:opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            handleReorder(
                              image.id,
                              "left",
                              image.display_order,
                              variant.id,
                            )
                          }
                          disabled={image.display_order === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:disabled:opacity-50 disabled:opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            handleReorder(
                              image.id,
                              "right",
                              image.display_order,
                              variant.id,
                            )
                          }
                          disabled={
                            image.display_order ===
                            (variant?.images?.length || -1) - 1
                          }
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setDeleteImageId(image.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
          </div>
        </Card>
      ))}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              {deleteVariantId ? "all images for this variant" : "this image"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
