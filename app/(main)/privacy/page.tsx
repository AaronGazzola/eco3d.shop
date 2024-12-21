export default function PrivacyPage() {
  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <div className="prose dark:prose-invert">
        <h2>Information Collection</h2>
        <p>
          We collect information that you provide directly to us, including
          name, email address, and shipping information when placing an order.
        </p>

        <h2>Use of Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Process your orders and send order confirmations</li>
          <li>Communicate with you about products and services</li>
          <li>Improve our website and services</li>
        </ul>

        <h2>Data Security</h2>
        <p>
          We implement appropriate security measures to protect your personal
          information from unauthorized access or disclosure.
        </p>
      </div>
    </div>
  );
}
