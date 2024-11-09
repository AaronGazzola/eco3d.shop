"use client";

import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";

import ActionButton from "@/components/layout/ActionButton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ConfirmDeleteDialog from "@/components/ux/ConfirmDeleteDialog";
import {
  useCreatePromoCodeAndKey,
  useDeletePromoCodeAndKey,
  useUpdatePromoCodeAndKey,
} from "@/hooks/promoHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { DialogTitle } from "@radix-ui/react-dialog";
import { CalendarIcon, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

// TODO: disable update until fom valid, include is seen as checkbox in form, remove duplicate update hook

const formSchema = z.object({
  promoKey: z.string().min(2, {
    message: "Promo Key must be at least 2 characters.",
  }),
  promoCode: z.string().min(1, {
    message: "Promo Code cannot be empty.",
  }),
  discountPercent: z.preprocess(
    val => parseInt(val as string, 10),
    z.number().min(1).max(50),
  ),
  expirationDate: z.date().refine(date => date >= new Date(), {
    message: "Expiration date must be in the future.",
  }),
});

type PromoDialogProps = {
  promoData?: {
    id?: string;
    promoKey: string;
    promoCode: string;
    discountPercent: number;
    expirationDate: string;
    isSeen: boolean;
  };
};

const PromoDialog = ({ promoData }: PromoDialogProps) => {
  const isEdit = Boolean(promoData);
  const [prevIsSeen, setPrevIsSeen] = useState(promoData?.isSeen);

  const { dismiss, dialog } = useDialogQueue();

  const {
    isPending: isDeleting,
    isSuccess: isDeleted,
    reset: resetDelete,
    loading: deleteIsLoading,
  } = useDeletePromoCodeAndKey();
  const {
    mutate: createPromoCodeAndKey,
    isPending: isCreating,
    isSuccess: isCreated,
    reset: resetCreate,
  } = useCreatePromoCodeAndKey();
  const {
    mutate: updatePromoCodeAndKey,
    isPending: isUpdating,
    isSuccess: isUpdated,
    reset: resetUpdate,
    loading: updateIsLoading,
  } = useUpdatePromoCodeAndKey();
  const {
    mutate: updateSeenPromoCode,
    isPending: isSeenIsUpdating,
    isSuccess: isSeenIsUpdated,
    reset: isSeenResetUpdate,
    loading: isSeenUpdateIsLoading,
  } = useUpdatePromoCodeAndKey();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      promoKey: promoData?.promoKey || "",
      promoCode: promoData?.promoCode || "",
      discountPercent: promoData?.discountPercent || undefined,
      expirationDate: promoData
        ? new Date(promoData.expirationDate)
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (isEdit && promoData?.id)
      return updatePromoCodeAndKey({
        id: promoData.id,
        code: values.promoCode,
        key: values.promoKey,
        discountPercentage: values.discountPercent,
        expirationDate: values.expirationDate.toISOString(),
      });
    createPromoCodeAndKey({
      code: values.promoCode,
      key: values.promoKey,
      discountPercentage: values.discountPercent,
      expirationDate: values.expirationDate.toISOString(),
    });
  }

  const onToggleIsSeen = () => {
    if (!isEdit || !promoData?.id) return;
    updateSeenPromoCode({
      id: promoData.id,
      isSeen: !promoData.isSeen,
    });
    setPrevIsSeen(promoData?.isSeen);
  };

  useEffect(() => {
    if (
      isDeleted ||
      isCreated ||
      (isUpdated && prevIsSeen === promoData?.isSeen)
    )
      dismiss();

    if (isCreated) resetCreate();
    if (isDeleted) resetDelete();
    if (isUpdated) resetUpdate();
  }, [
    isDeleted,
    dismiss,
    isCreated,
    isUpdated,
    resetCreate,
    resetDelete,
    resetUpdate,
    promoData?.isSeen,
    prevIsSeen,
  ]);

  return (
    <>
      <DialogTitle className="text-lg font-medium">Add Promo</DialogTitle>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Promo Key Field */}
          <FormField
            control={form.control}
            name="promoKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promo Key</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} />
                </FormControl>
                <FormDescription>Code displayed on promo items</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Promo Code Field */}
          <FormField
            control={form.control}
            name="promoCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promo Code</FormLabel>
                <FormControl>
                  <Input placeholder="3DYAY" {...field} />
                </FormControl>
                <FormDescription>
                  Unique code used to apply discount
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Discount Percent Field */}
          <FormField
            control={form.control}
            name="discountPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Percent</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Percent(1-50)" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the discount up to 50% off.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Expiration Date Field */}
          <FormField
            control={form.control}
            name="expirationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiration Date</FormLabel>
                <FormControl>
                  <Popover modal>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={date => field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormDescription>
                  Select the expiration date for the promo code.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-between">
            {isEdit && (
              <>
                <ActionButton
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    dialog(
                      <ConfirmDeleteDialog
                        id={promoData?.id ?? ""}
                        name={promoData?.promoKey ?? ""}
                        table="promo_codes"
                      />,
                    )
                  }
                  loading={isDeleting}
                >
                  Delete
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="ghost"
                  disabled={isUpdating}
                  loading={isSeenUpdateIsLoading}
                  onClick={onToggleIsSeen}
                >
                  {promoData?.isSeen ? <Eye /> : <EyeOff />}
                </ActionButton>
              </>
            )}
            <ActionButton
              type="submit"
              className={cn(!isEdit && "w-full")}
              loading={isEdit ? updateIsLoading : isCreating}
            >
              {isEdit ? "Update" : "Create"}
            </ActionButton>
          </div>
        </form>
      </Form>
    </>
  );
};

export default PromoDialog;
