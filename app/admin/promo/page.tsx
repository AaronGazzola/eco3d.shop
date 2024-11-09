"use client";

import PromoDialog from "@/app/admin/promo/PromoDialog";
import { PromoTable, columns } from "@/app/admin/promo/PromoTable";
import ActionButton from "@/components/layout/ActionButton";
import { useGetPromoCodes } from "@/hooks/promoHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";

const PromoPage = () => {
  const { dialog } = useDialogQueue();
  const { data: promoCodes } = useGetPromoCodes();

  const data =
    promoCodes?.map(promoCode => ({
      id: promoCode.id,
      promo_key: promoCode.promo_key?.item_code || "",
      promo_code: promoCode.promo_code,
      discountPercent: promoCode.percentage_discount,
      expirationDate: promoCode.expiration_date,
      isRedeemed: !!promoCode.is_redeemed,
      isSeen: !!promoCode.is_seen,
    })) ?? [];

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between pb-3">
        <ActionButton onClick={() => dialog(<PromoDialog />)}>
          Add Promo
        </ActionButton>
      </div>
      <PromoTable columns={columns} data={data} />
    </div>
  );
};

export default PromoPage;
