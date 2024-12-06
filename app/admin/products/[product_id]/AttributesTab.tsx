"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddProductVariantAttribute,
  useDeleteProductVariant,
  useGetProductVariants,
} from "@/hooks/productVariantHooks";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

interface AttributeMap {
  [key: string]: Set<string>;
}

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export function AttributesTab({ productId }: { productId: string }) {
  const { data: variants } = useGetProductVariants(productId);
  const addAttribute = useAddProductVariantAttribute();
  const deleteVariant = useDeleteProductVariant();
  const [attributeMap, setAttributeMap] = useState<AttributeMap>({});
  const [newAttribute, setNewAttribute] = useState("");
  const [newValue, setNewValue] = useState("");
  const [selectedAttribute, setSelectedAttribute] = useState<string>("");

  useEffect(() => {
    if (!variants) return;
    const map: AttributeMap = {};
    variants.forEach(variant => {
      if (isJsonObject(variant.custom_attributes)) {
        Object.entries(variant.custom_attributes).forEach(([key, value]) => {
          if (!map[key]) map[key] = new Set();
          map[key].add(String(value));
        });
      }
    });
    setAttributeMap(map);
  }, [variants]);

  const handleAddAttribute = () => {
    if (!newAttribute) return;
    setAttributeMap(prev => ({ ...prev, [newAttribute]: new Set() }));
    setNewAttribute("");
    setSelectedAttribute(newAttribute);
  };

  const handleAddValue = () => {
    if (!selectedAttribute || !newValue) return;

    const newMap = { ...attributeMap };
    newMap[selectedAttribute] = new Set([
      ...newMap[selectedAttribute],
      newValue,
    ]);
    setAttributeMap(newMap);

    addAttribute.mutate({
      productId,
      attributeName: selectedAttribute,
      options: Array.from(newMap[selectedAttribute]),
    });

    setNewValue("");
  };

  const handleRemoveValue = (attribute: string, value: string) => {
    const newMap = { ...attributeMap };
    newMap[attribute].delete(value);
    setAttributeMap(newMap);

    addAttribute.mutate({
      productId,
      attributeName: attribute,
      options: Array.from(newMap[attribute]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input
          placeholder="New attribute name"
          value={newAttribute}
          onChange={e => setNewAttribute(e.target.value)}
        />
        <Button onClick={handleAddAttribute}>
          <Plus className="w-4 h-4 mr-2" />
          Add Attribute
        </Button>
      </div>

      {Object.entries(attributeMap).map(([attribute, values]) => (
        <div key={attribute} className="space-y-4 p-4 border rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{attribute}</h3>
            <Button
              variant="ghost"
              onClick={() => setSelectedAttribute(attribute)}
            >
              Edit Values
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from(values).map(value => (
              <Badge key={value} variant="secondary">
                {value}
                <button
                  onClick={() => handleRemoveValue(attribute, value)}
                  className="ml-2"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          {selectedAttribute === attribute && (
            <div className="flex gap-4 mt-4">
              <Input
                placeholder="New value"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
              />
              <Button onClick={handleAddValue}>Add Value</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
