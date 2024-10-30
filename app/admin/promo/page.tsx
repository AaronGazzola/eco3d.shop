"use client";

import AddPromoDialog from "@/app/admin/promo/AddPromoDialog";
import { Promo, PromoTable, columns } from "@/app/admin/promo/PromoTable";
import ActionButton from "@/components/layout/ActionButton";
import { useDialogQueue } from "@/hooks/useDialogQueue";

const data: Promo[] = [
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
  {
    promo_key: "123456",
    promo_code: "2DNOWAY!",
    discountPercent: 10,
  },
];

const PromoPage = () => {
  const { dialog } = useDialogQueue();
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
