"use client";
import ActionButton from "@/components/layout/ActionButton";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import * as Form from "@radix-ui/react-form";

const AddProductDialog = () => (
  <DialogContent className="max-h-[95vh] overflow-auto">
    <DialogHeader>
      <DialogTitle className="text-3xl">Add Product</DialogTitle>
    </DialogHeader>
    <Form.Root className="space-y-3">
      <Form.Field name="productName">
        <div>
          <Form.Label>Product Name</Form.Label>
          <Form.Message match="valueMissing">
            Please enter the product name
          </Form.Message>
        </div>
        <Form.Control asChild>
          <Input type="text" required />
        </Form.Control>
      </Form.Field>

      <Form.Field name="productDescription">
        <div>
          <Form.Label className="FormLabel">Product Description</Form.Label>
          <Form.Message match="valueMissing">
            Please enter the product description
          </Form.Message>
        </div>
        <Form.Control asChild>
          <Textarea required />
        </Form.Control>
      </Form.Field>

      <Form.Submit asChild>
        <ActionButton className="w-full">Add Product</ActionButton>
      </Form.Submit>
    </Form.Root>
  </DialogContent>
);

export default AddProductDialog;
