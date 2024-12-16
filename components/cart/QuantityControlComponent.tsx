import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

interface QuantityControlProps {
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  onDelete?: () => void;
}

const QuantityControl = ({
  quantity,
  onQuantityChange,
  onDelete,
}: QuantityControlProps) => {
  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    } else if (onDelete) {
      onDelete();
    }
  };

  const handleIncrement = () => {
    onQuantityChange(quantity + 1);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2.5">
      <span className="text-sm font-bold text-gray-600">Quantity:</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleDecrement}
        >
          {quantity === 1 ? (
            <Trash2Icon className="h-4 w-4" />
          ) : (
            <MinusIcon className="h-4 w-4" />
          )}
        </Button>
        <span className="w-8 text-center font-semibold text-gray-800">
          {quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleIncrement}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default QuantityControl;
