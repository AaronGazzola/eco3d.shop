"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-6 space-y-8">
          <div className="border-b pb-4">
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: December 21, 2024
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                1. Information We Collect
              </h2>
              <p>When you use Eco3D, we collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account information (name, email, password)</li>
                <li>Billing and shipping addresses</li>
                <li>Order history and preferences</li>
                <li>Payment information (processed securely by Stripe)</li>
                <li>Device information and usage analytics</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                2. How We Use Your Data
              </h2>
              <p>Your information helps us:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and fulfill your orders</li>
                <li>Communicate about order status and updates</li>
                <li>Improve our products and services</li>
                <li>Provide customer support</li>
                <li>Send relevant marketing communications</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                3. Data Storage and Security
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Data is stored securely using industry-standard encryption
                </li>
                <li>We use Supabase for database management</li>
                <li>Payment details are processed and stored by Stripe</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">4. Data Sharing</h2>
              <p>We share data only with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Shipping partners to deliver your orders</li>
                <li>Payment processors to handle transactions</li>
                <li>Analytics services to improve our platform</li>
                <li>Legal authorities when required by law</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Request data deletion</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                6. Cookies and Tracking
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Essential cookies for site functionality</li>
                <li>Analytics cookies to improve user experience</li>
                <li>Session tracking for cart management</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">7. Policy Updates</h2>
              <p>
                We may update this policy periodically. Changes will be posted
                here with a new &quot;Last updated&quot; date. Continued use of
                our services constitutes acceptance of any changes.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
