"use client";
export default function TermsPage() {
  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <h1 className="text-4xl font-bold">Terms of Service</h1>
      <div className="prose dark:prose-invert">
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing our website and services, you agree to be bound by these
          terms of service and all applicable laws and regulations.
        </p>
        <h2>2. Use License</h2>
        <p>
          Permission is granted to temporarily access the materials on
          Eco3D&apos;s website for personal, non-commercial use only.
        </p>
        <h2>3. Product Information</h2>
        <p>
          We strive to display our products as accurately as possible, but we
          cannot guarantee that your device&apos;s display will accurately
          reflect the final product.
        </p>
        <h2>4. Pricing and Payment</h2>
        <p>
          All prices are in AUD and subject to change without notice. We reserve
          the right to refuse any order.
        </p>
      </div>
    </div>
  );
}
