"use client";

import AddPromoDialog from "@/app/admin/promo/AddPromoDialog";
import { PromoTable, columns } from "@/app/admin/promo/PromoTable";
import ActionButton from "@/components/layout/ActionButton";
import { useGetPromoCodes } from "@/hooks/promoHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";

const PromoPage = () => {
  const { dialog } = useDialogQueue();
  const { data: promoCodes } = useGetPromoCodes();

  const data =
    promoCodes?.map((promoCode) => ({
      promo_key: promoCode.promo_key?.item_code || "",
      promo_code: promoCode.promo_code,
      discountPercent: promoCode.percentage_discount,
    })) ?? [];

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between pb-3">
        <ActionButton onClick={() => dialog(<AddPromoDialog />)}>
          Add Promo
        </ActionButton>
      </div>
      <PromoTable
        columns={columns}
        data={data}
      />
    </div>
  );
};

export default PromoPage;
