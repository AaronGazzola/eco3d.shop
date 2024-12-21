import { calculateShippingCost, formatPrice } from "@/lib/cart.util";
import { CartItem } from "@/types/cart.types";

export function generateOrderConfirmationHtml(
  orderId: string,
  items: CartItem[],
  total: number,
) {
  const shippingCost = calculateShippingCost(total);
  const totalWithShipping = total + shippingCost;
  const itemsHtml = items
    .map(
      (item) => `
      <table role="presentation" style="width: 100%; margin-bottom: 16px;">
        <tr>
          <td>
            <p style="color: #0F172A; font-size: 16px; margin: 0; line-height: 24px;">
              ${item.size} - ${item.colors?.join(", ")}
            </p>
            <p style="color: #64748B; font-size: 14px; margin: 4px 0 16px; line-height: 24px;">
              Quantity: ${item.quantity}
            </p>
          </td>
          <td align="right" style="color: #0F172A; font-size: 16px;">
            ${formatPrice(item.price * item.quantity)}
          </td>
        </tr>
      </table>
    `,
    )
    .join("");

  return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Order Confirmation</title>
          <style>
            @media only screen and (max-width: 620px) {
              table.body h1 {
                font-size: 28px !important;
                margin-bottom: 10px !important;
              }
              table.body p,
              table.body td,
              table.body span {
                font-size: 16px !important;
              }
              table.body .container {
                padding: 0 !important;
                width: 100% !important;
              }
            }
          </style>
        </head>
        <body style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 16px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; width: 100%; background-color: #f8fafc">
            <tr>
              <td>&nbsp;</td>
              <td style="display: block; margin: 0 auto; max-width: 580px; padding: 10px;">
                <div class="container" style="background: #ffffff; padding: 40px; margin: 40px auto; max-width: 580px;">
                  <table role="presentation" style="width: 100%">
                    <tr>
                      <td>
                        <h1 style="color: #0F172A; font-size: 24px; font-weight: 600; line-height: 32px; margin: 0 0 24px; text-align: center;">
                          Order Confirmed!
                        </h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 24px; text-align: center;">
                          Order #${orderId}
                        </p>
                        
                        ${itemsHtml}
                        
                        <table role="presentation" style="width: 100%; margin-top: 24px; border-top: 2px solid #E2E8F0;">
                          <tr>
                            <td style="padding-top: 16px;">
                              <p style="color: #64748B; font-size: 16px; margin: 0;">Shipping</p>
                            </td>
                            <td align="right" style="padding-top: 16px;">
                              <p style="color: #64748B; font-size: 16px; margin: 0;">${formatPrice(shippingCost)}</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top: 16px;">
                              <p style="color: #0F172A; font-size: 18px; font-weight: 600; margin: 0;">Total</p>
                            </td>
                            <td align="right" style="padding-top: 16px;">
                              <p style="color: #0F172A; font-size: 18px; font-weight: 600; margin: 0;">${formatPrice(totalWithShipping)}</p>
                            </td>
                          </tr>
                        </table>
  
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin: 32px 0">
                          <tr>
                            <td align="center">
                              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/me" 
                                 style="background-color: hsl(141, 71%, 29%); border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 500; line-height: 1; padding: 12px 24px; text-align: center; text-decoration: none;">
                                View Order
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
              <td>&nbsp;</td>
            </tr>
          </table>
        </body>
      </html>
    `;
}
