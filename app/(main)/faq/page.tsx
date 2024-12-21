import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FAQPage() {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>What materials do you use for 3D printing?</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We use biodegradable PHA (Polyhydroxyalkanoate) material for all
              our 3D printed products. This eco-friendly material breaks down
              naturally while maintaining excellent durability.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How long does shipping take?</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Shipping times vary based on product availability and your
              location. Most orders are processed within 1-2 business days, and
              delivery typically takes 3-5 business days within Australia.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What is your return policy?</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We accept returns within 30 days of purchase for unused items in
              original packaging. Custom orders are non-refundable unless
              defective.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
