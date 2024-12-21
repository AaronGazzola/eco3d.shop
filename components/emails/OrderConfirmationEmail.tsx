import { formatPrice } from "@/lib/cart.util";
import { CartItem } from "@/types/cart.types";
import EmailTemplate from "./EmailTemplate";

type OrderConfirmationEmailProps = {
  orderId: string;
  items: CartItem[];
  total: number;
};

export default function OrderConfirmationEmail({
  orderId,
  items,
  total,
}: OrderConfirmationEmailProps) {
  return (
    <EmailTemplate
      preview="Your order has been confirmed"
      title="Order Confirmed!"
      subtitle={`Order #${orderId}`}
      buttons={[{ text: "My orders", href: "/me", style: "primary" }]}
    >
      <div style={{ textAlign: "left", marginTop: "24px" }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              marginBottom: "16px",
              borderBottom: "1px solid #E2E8F0",
              paddingBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: "0", fontSize: "16px", color: "#0F172A" }}>
                  {item.size} - {item.colors?.join(", ")}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "14px",
                    color: "#64748B",
                  }}
                >
                  Quantity: {item.quantity}
                </p>
              </div>
              <p style={{ margin: "0", fontSize: "16px", color: "#0F172A" }}>
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: "24px",
            borderTop: "2px solid #E2E8F0",
            paddingTop: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <p
              style={{
                margin: "0",
                fontSize: "18px",
                fontWeight: 600,
                color: "#0F172A",
              }}
            >
              Total
            </p>
            <p
              style={{
                margin: "0",
                fontSize: "18px",
                fontWeight: 600,
                color: "#0F172A",
              }}
            >
              {formatPrice(total)}
            </p>
          </div>
        </div>
      </div>
    </EmailTemplate>
  );
}
