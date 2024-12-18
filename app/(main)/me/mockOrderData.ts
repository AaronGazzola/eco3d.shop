"use client";
import { Order, OrderStatus, RefundStatus } from "@/types/order.types";
import { faker } from "@faker-js/faker";

const generateOrderItems = (min = 1, max = 3) => {
  const items = [];
  const count = faker.number.int({ min, max });

  const primaryTextLines = ["12345678", "1234567890", "123456"];
  const secondaryText = "1234567890";

  for (let i = 0; i < count; i++) {
    const size = faker.helpers.arrayElement([
      "Small",
      "Medium",
      "Large",
    ] as const);
    items.push({
      id: faker.number.int({ min: 1000, max: 9999 }),
      name: "V8 Engine",
      imageUrl: "/images/products/V8/small/Set 3 second shoot-27.jpg",
      size,
      colors: faker.helpers.arrayElements(["Natural", "Black", "White"], {
        min: 1,
        max: 3,
      }),
      primaryText: size === "Large" ? primaryTextLines : undefined,
      secondaryText: size !== "Medium" ? secondaryText : undefined,
      price: faker.number.float({ min: 19.99, max: 49.99 }),
      quantity: faker.number.int({ min: 1, max: 5 }),
    });
  }
  return items;
};

const generateOrder = (
  status: OrderStatus | RefundStatus,
  isRefund = false,
): Order => {
  const items = generateOrderItems();
  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shippingCost = faker.number.float({ min: 5.99, max: 15.99 });
  const totalPrice = itemsTotal + shippingCost;

  return {
    id: faker.string.uuid(),
    status,
    isRefund,
    startTime: faker.date.recent(),
    trackingNumber: faker.helpers.maybe(() =>
      faker.string.alphanumeric(12).toUpperCase(),
    ),
    recipientName: faker.person.fullName(),
    addressLine1: faker.location.streetAddress(),
    addressLine2: faker.helpers.maybe(() => faker.location.secondaryAddress()),
    city: faker.location.city(),
    state: faker.location.state(),
    postalCode: faker.location.zipCode(),
    country: "Australia",
    totalPrice,
    shippingCost,
    expectedFulfillmentDate: faker.date.soon({ days: 14 }),
    currency: "AUD",
    items,
    createdAt: faker.date.recent(),
  };
};

export const mockOrders: Order[] = [
  generateOrder(OrderStatus.Waiting),
  generateOrder(OrderStatus.Printing),
  generateOrder(OrderStatus.Shipped),
  generateOrder(OrderStatus.Delivered),
  generateOrder(RefundStatus.Pending, true),
  generateOrder(RefundStatus.Processing, true),
  generateOrder(RefundStatus.Processed, true),
];
