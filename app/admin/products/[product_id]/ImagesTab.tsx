"use client";
import { assignImageToVariantAction } from "@/actions/imageActions";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDeleteAllVariantImages,
  useDeleteVariantImage,
  useUpdateImageOrder,
  useUploadVariantImage,
} from "@/hooks/imageHooks";
import { useGetProductVariants } from "@/hooks/productVariantHooks";
import { useToastQueue } from "@/hooks/useToastQueue";
import { getStorageUrl } from "@/lib/storage.util";
import { cn } from "@/lib/utils";
import { ProductVariantWithImages } from "@/types/db.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
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
  const [reuseDialogOpen, setReuseDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    id: string;
    path: string;
  } | null>(null);
  const [targetVariantId, setTargetVariantId] = useState<string>();
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  const assignExistingImage = useMutation({
    mutationFn: async ({
      imageId,
      variantId,
    }: {
      imageId: string;
      variantId: string;
    }) => {
      const { data, error } = await assignImageToVariantAction(
        imageId,
        variantId,
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product_variants", productId],
      });
      setReuseDialogOpen(false);
      setSelectedImage(null);
      setTargetVariantId(undefined);
      toast({
        title: "Image assigned successfully",
      });
    },

    onError: (error) => {
      toast({
        title: error.message,
        open: true,
      });
    },
  });

  const handleAssignImage = async () => {
    if (!selectedImage || !targetVariantId) return;
    await assignExistingImage.mutateAsync({
      imageId: selectedImage.id,
      variantId: targetVariantId,
    });
  };

  const setFileInputRef =
    (variantId: string) => (el: HTMLInputElement | null) => {
      fileInputRefs.current[variantId] = el;
    };

  const handleFileUpload = async (variantId: string, files: FileList) => {
    for (const file of files) {
      await uploadImage.mutateAsync({ file, variantId, productId });
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
    variantImageId: string,
    direction: "left" | "right",
    currentOrder: number,
    variantId: string,
  ) => {
    const newOrder = direction === "left" ? currentOrder - 1 : currentOrder + 1;
    await updateOrder.mutateAsync({ variantImageId, newOrder, variantId });
  };

  const getAllImages = (variants: ProductVariantWithImages[]) => {
    const images = new Set<string>();
    variants.forEach((variant) => {
      variant.variant_images?.forEach((vi) => {
        if (vi.images?.id && vi.images.image_path) {
          images.add(
            JSON.stringify({
              id: vi.images.id,
              path: vi.images.image_path,
            }),
          );
        }
      });
    });
    return Array.from(images).map((img) => JSON.parse(img));
  };

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {variants?.map((variant) => (
        <Card key={variant.id} className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {variant.variant_name}
              </h3>
              <div className="space-y-1">
                {Object.entries(variant.attributes || {}).map(
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTargetVariantId(variant.id);
                  setReuseDialogOpen(true);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Reuse Image
              </Button>
              <input
                type="file"
                ref={setFileInputRef(variant.id)}
                className="hidden"
                multiple
                accept="image/*"
                onChange={(e) => {
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
            {variant.variant_images?.length ? (
              variant.variant_images
                .sort((a, b) => a.display_order - b.display_order)
                .map((variantImage) => (
                  <div key={variantImage.id} className="relative group">
                    <div className="w-32 h-32 relative rounded-lg overflow-hidden">
                      <Image
                        src={getStorageUrl(
                          variantImage.images?.image_path || "",
                        )}
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
                              variantImage.id,
                              "left",
                              variantImage.display_order,
                              variant.id,
                            )
                          }
                          disabled={variantImage.display_order === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:disabled:opacity-50 disabled:opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            handleReorder(
                              variantImage.id,
                              "right",
                              variantImage.display_order,
                              variant.id,
                            )
                          }
                          disabled={
                            variantImage.display_order ===
                            (variant?.variant_images?.length || 0) - 1
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
                          setDeleteImageId(variantImage.images?.id);
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

      <Dialog open={reuseDialogOpen} onOpenChange={setReuseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Image to Reuse</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-3 gap-4">
              {variants &&
                getAllImages(variants).map((img) => (
                  <div
                    key={img.id}
                    className={cn(
                      "relative cursor-pointer rounded-lg overflow-hidden",
                      selectedImage?.id === img.id && "ring-2 ring-primary",
                    )}
                    onClick={() => setSelectedImage(img)}
                  >
                    <Image
                      src={getStorageUrl(img.path)}
                      alt=""
                      width={200}
                      height={200}
                      className="object-cover aspect-square"
                    />
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              onClick={handleAssignImage}
              disabled={!selectedImage || !targetVariantId}
            >
              Assign Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
