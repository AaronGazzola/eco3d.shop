"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddProductVariantAttribute,
  useGetProductVariants,
} from "@/hooks/productVariantHooks";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

interface AttributeMap {
  [key: string]: {
    type: "single" | "multi";
    values: Set<string>;
  };
}

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export function AttributesTab({ productId }: { productId: string }) {
  const { data: variants } = useGetProductVariants(productId);
  const addAttribute = useAddProductVariantAttribute();
  const [attributeMap, setAttributeMap] = useState<AttributeMap>({});
  const [newAttribute, setNewAttribute] = useState("");
  const [newAttributeType, setNewAttributeType] = useState<"single" | "multi">(
    "single",
  );
  const [newValue, setNewValue] = useState("");
  const [selectedAttribute, setSelectedAttribute] = useState<string>("");

  useEffect(() => {
    if (!variants) return;
    const map: AttributeMap = {};
    variants.forEach((variant) => {
      if (isJsonObject(variant.attributes)) {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!map[key]) {
            map[key] = {
              type: Array.isArray(value) ? "multi" : "single",
              values: new Set(),
            };
          }
          if (Array.isArray(value)) {
            value.forEach((v) => map[key].values.add(String(v)));
          } else {
            map[key].values.add(String(value));
          }
        });
      }
    });
    setAttributeMap(map);
  }, [variants]);

  const handleAddAttribute = () => {
    if (!newAttribute) return;
    setAttributeMap((prev) => ({
      ...prev,
      [newAttribute]: {
        type: newAttributeType,
        values: new Set(),
      },
    }));
    setNewAttribute("");
    setSelectedAttribute(newAttribute);
  };

  const generateCombinations = (attributeName: string, values: string[]) => {
    const otherAttributes = Object.entries(attributeMap).filter(
      ([name]) => name !== attributeName,
    );
    let combinations: Record<string, unknown>[] = [];

    // Generate combinations for the current attribute
    if (attributeMap[attributeName].type === "multi") {
      // For multi-select, generate all possible combinations of values (powerset excluding empty set)
      const powerSet = (arr: string[]): string[][] => {
        return arr
          .reduce(
            (subsets, value) =>
              subsets.concat(subsets.map((set) => [...set, value])),
            [[]] as string[][],
          )
          .filter((set) => set.length > 0);
      };
      combinations = powerSet(values).map((combo) => ({
        [attributeName]: combo,
      }));
    } else {
      combinations = values.map((value) => ({ [attributeName]: value }));
    }

    // Combine with other attributes
    otherAttributes.forEach(([name, { type, values }]) => {
      const currentValues = Array.from(values);
      const newCombinations: Record<string, unknown>[] = [];

      combinations.forEach((combo) => {
        if (type === "multi") {
          const powerSet = (arr: string[]): string[][] => {
            return arr
              .reduce(
                (subsets, value) =>
                  subsets.concat(subsets.map((set) => [...set, value])),
                [[]] as string[][],
              )
              .filter((set) => set.length > 0);
          };
          powerSet(currentValues).forEach((valueCombo) => {
            newCombinations.push({ ...combo, [name]: valueCombo });
          });
        } else {
          currentValues.forEach((value) => {
            newCombinations.push({ ...combo, [name]: value });
          });
        }
      });
      combinations = newCombinations;
    });

    return combinations;
  };

  const handleAddValue = () => {
    if (!selectedAttribute || !newValue) return;

    const newMap = { ...attributeMap };
    newMap[selectedAttribute].values.add(newValue);
    setAttributeMap(newMap);

    const combinations = generateCombinations(
      selectedAttribute,
      Array.from(newMap[selectedAttribute].values),
    );

    addAttribute.mutate({
      productId,
      attributeName: selectedAttribute,
      options: Array.from(newMap[selectedAttribute].values),
      isMultiValue: newMap[selectedAttribute].type === "multi",
      combinations,
    });

    setNewValue("");
  };

  const handleRemoveValue = (attribute: string, valueToRemove: string) => {
    const newMap = { ...attributeMap };
    newMap[attribute].values.delete(valueToRemove);
    setAttributeMap(newMap);

    const combinations = generateCombinations(
      attribute,
      Array.from(newMap[attribute].values),
    );

    addAttribute.mutate({
      productId,
      attributeName: attribute,
      options: Array.from(newMap[attribute].values),
      isMultiValue: newMap[attribute].type === "multi",
      combinations,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input
          placeholder="New attribute name"
          value={newAttribute}
          onChange={(e) => setNewAttribute(e.target.value)}
        />
        <Select
          value={newAttributeType}
          onValueChange={(value: "single" | "multi") =>
            setNewAttributeType(value)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single Value</SelectItem>
            <SelectItem value="multi">Multi Value</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAddAttribute}>
          <Plus className="w-4 h-4 mr-2" />
          Add Attribute
        </Button>
      </div>

      {Object.entries(attributeMap).map(([attribute, { type, values }]) => (
        <div key={attribute} className="space-y-4 p-4 border rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{attribute}</h3>
              <p className="text-sm text-muted-foreground">
                {type === "multi"
                  ? "Multiple values allowed"
                  : "Single value only"}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setSelectedAttribute(attribute)}
            >
              Edit Values
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from(values).map((value) => (
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
                onChange={(e) => setNewValue(e.target.value)}
              />
              <Button onClick={handleAddValue}>Add Value</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
