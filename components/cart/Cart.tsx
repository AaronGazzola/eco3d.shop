import { CartItem } from "@/components/cart/CartItem";

const dummyCartData = [
  {
    id: 1,
    name: "Product 1",
    price: 100,
    quantity: 2,
  },
  {
    id: 2,
    name: "Product 2",
    price: 200,
    quantity: 1,
  },
  {
    id: 3,
    name: "Product 3",
    price: 300,
    quantity: 3,
  },
];

export const Cart = () => {
  return (
    <div className="w-full h-full flex flex-col items-stretch">
      {dummyCartData.map(item => (
        <CartItem key={item.id} item={item} />
      ))}
    </div>
  );
};
