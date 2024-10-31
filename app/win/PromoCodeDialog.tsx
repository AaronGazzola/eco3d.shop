import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PromoCodeWithPromoKey } from "@/types/db.types";
import dayjs from "dayjs";

const PromoCodeDialog = ({
  promoCode: { promo_code, percentage_discount, expiration_date },
}: {
  promoCode: PromoCodeWithPromoKey;
}) => {
  return (
    <>
      <DialogTitle className="text-lg font-medium text-center">
        Congratulations!
      </DialogTitle>
      <div className="text-center flex flex-col items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 w-min">
          <p className="text-3xl font-bold text-green-700 dark:text-green-500">
            {promo_code}
          </p>
        </div>
        <p className="text-lg font-bold">{percentage_discount}% OFF</p>
      </div>
      <DialogDescription className="text-center">
        Use this promo code at checkout once our store opens to recieve{" "}
        {percentage_discount}% off the total price of your order. <br />
        <br /> Redeem before{" "}
        <strong>{dayjs(expiration_date).format("D-MMM-YY")}</strong>.
      </DialogDescription>
    </>
  );
};

export default PromoCodeDialog;
