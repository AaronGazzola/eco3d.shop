"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-6 space-y-8">
          <div className="border-b pb-4">
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: December 21, 2024
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">1. Agreement to Terms</h2>
              <p>
                By accessing and using Eco3D&apos;s services, you agree to be
                bound by these Terms of Service. If you disagree with any part
                of these terms, you may not access our services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                2. Products and Services
              </h2>
              <p>
                Eco3D specializes in providing eco-friendly 3D printed products
                made with biodegradable PHA materials. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify product specifications without prior notice</li>
                <li>Limit sales of products to specific geographic regions</li>
                <li>Discontinue products or services at our discretion</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                3. Ordering and Payment
              </h2>
              <p>
                All prices are in Australian Dollars (AUD) unless otherwise
                specified. When placing an order:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  You must provide accurate and complete billing information
                </li>
                <li>Payment is required at the time of order placement</li>
                <li>
                  We reserve the right to refuse or cancel any order at our
                  discretion
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                4. Printing and Production
              </h2>
              <p>Our 3D printing service involves:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Production times vary based on order complexity and volume
                </li>
                <li>
                  Minor variations in color and finish may occur due to the
                  nature of 3D printing
                </li>
                <li>
                  Custom orders are subject to additional terms and review
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                5. Shipping and Delivery
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Delivery times are estimates and not guaranteed</li>
                <li>Risk of loss transfers upon delivery to the carrier</li>
                <li>International shipping may be subject to customs duties</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">6. Returns and Refunds</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Items must be returned within 14 days of receipt</li>
                <li>
                  Custom orders are not eligible for return unless defective
                </li>
                <li>Refunds will be processed within 5-7 business days</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                7. Intellectual Property
              </h2>
              <p>
                All designs, content, and materials on our website are protected
                by intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reproduce or distribute our designs without permission</li>
                <li>Use our intellectual property for commercial purposes</li>
                <li>Modify or create derivative works of our designs</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                8. Limitation of Liability
              </h2>
              <p>
                Eco3D shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages resulting from your use of
                our services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Changes
                will be effective immediately upon posting to our website.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
