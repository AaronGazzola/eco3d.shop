import { CartItem } from "@/components/cart/CartItem";
import { ShoppingBasket, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export const Cart = ({ className }: { className?: string }) => {
  const calcTotal = () => {
    return (
      dummyCartData.reduce((acc, curr) => acc + curr.price, 0) +
      dummyData.offset +
      dummyData.shipping
    );
  };

  return (
    <div className={cn("w-full h-full flex flex-col relative", className)}>
      <div className="flex w-[90%] mx-auto items-center px-[10px]">
        <ShoppingBasket />
        <div className="text-[21px] font-bold mx-[10px] ">Your cart</div>
      </div>
      <div className="flex flex-col w-[90%] mx-auto mt-[20px] gap-[10px] overflow-auto min-h-[200px] max-h-[calc(100vh-360px)]">
        {dummyCartData.map(cart => (
          <CartItem key={cart.id} item={cart}></CartItem>
        ))}
      </div>
      <div className="mt-[20px] px-[30px] text-right">
        <div className="flex justify-between items-center py-2">
          <div className="text-gray-700 font-medium flex-1">Carbon offset:</div>
          <div className="text-gray-900 font-semibold w-[100px]">
            ${dummyData.offset}
          </div>
        </div>
        <div className="flex justify-between items-center py-2">
          <div className="text-gray-700 font-medium flex-1">Shipping:</div>
          <div className="text-gray-900 font-semibold w-[100px]">
            ${dummyData.shipping}
          </div>
        </div>
        <hr />
        <div className="flex justify-between items-center py-2 ">
          <div className="text-gray-700 font-bold flex-1">Total: </div>
          <div className="text-gray-900 font-semibold w-[100px]">
            ${calcTotal()}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 flex h-[60px] justify-center items-center text-white font-extrabold text-[20px] shadow-lg transition-all duration-300 ease-in-out transform hover:scale-100 cursor-pointer">
        <ShoppingCart className="animate-bounce" />
        <div className="ml-[10px]">Checkout</div>
      </div>
    </div>
  );
};

const dummyCartData = [
  {
    id: 1,
    name: "Product 1",
    photo: "/images/products/v8/product1.jpg",
    price: 100,
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an Hyperlinks took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing",
  },
  {
    id: 2,
    name: "Product 2",
    photo: "/images/products/v8/product2.jpg",
    price: 200,
    description: "Lorem Ipsum is simply dummy",
  },
  {
    id: 3,
    name: "Product 3",
    photo: "/images/products/v8/product3.jpg",
    price: 300,
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an Hyperlinks took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing",
  },
  {
    id: 4,
    name: "Product 4",
    photo: "/images/products/v8/product4.jpg",
    price: 150,
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an Hyperlinks took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing",
  },
  {
    id: 5,
    name: "Product 5",
    photo: "/images/products/v8/product1.jpg",
    price: 200,
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an Hyperlinks took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing",
  },
  {
    id: 6,
    name: "Product 6",
    photo: "/images/products/v8/product2.jpg",
    price: 250,
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an Hyperlinks took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing",
  },
  {
    id: 7,
    name: "Product 7",
    photo: "/images/products/v8/product3.jpg",
    price: 350,
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an Hyperlinks took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing",
  },
];

const dummyData = {
  offset: 0.2,
  shipping: 12,
};
