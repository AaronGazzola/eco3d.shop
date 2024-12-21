"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { SquareArrowUpRight } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "What materials do you use for 3D printing?",
    answer: (
      <div className="space-y-4">
        <p className="text-lg">
          We use biodegradable PHA (Polyhydroxyalkanoate) material for all our
          3D printed products. This eco-friendly material breaks down naturally
          while maintaining excellent durability.
        </p>
        <a
          href="https://support.colorfabb.com/hc/en-150/articles/5620495587601-PHA"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-lg text-primary hover:underline"
        >
          More from our supplier <SquareArrowUpRight className="h-5 w-5" />
        </a>
      </div>
    ),
  },
  {
    question: "How long does shipping take?",
    answer:
      "Shipping times vary based on product availability and your location. Most orders are processed within 1-2 business days, and delivery typically takes 3-5 business days within Australia.",
  },
  {
    question: "What is your return policy?",
    answer:
      "Since all our products are custom-made, we do not accept returns unless the item is defective. If you receive a defective item, please contact us within 7 days of receipt with photos of the defect for a replacement or refund.",
  },

  {
    question: "How long will my product last?",
    answer:
      "Our products are made from a bio-fat created by Bacteria. This material is rigid like plastic, but also relatively temporary. These 3D printed gifts will remain beautiful if displayed in a cool, dry place, but can be damaged by heat, heavy handling, or outdoor conditions.",
  },
  {
    question: "Why choose a temporary product?",
    answer:
      "We believe in reimagining gift-giving. Like a greeting card or fresh flowers, our products bring joy without adding to permanent waste. Show that you care about them, and their planet.",
  },
];

export default function FAQPage() {
  return (
    <div className="w-full flex flex-col items-center p-8">
      <div className="container py-8 space-y-8 max-w-4xl">
        <h1 className="text-5xl font-bold">Frequently Asked Questions</h1>
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-xl text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-lg">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
