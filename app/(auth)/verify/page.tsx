import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyPage() {
  return (
    <div className="text-center space-y-4">
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Check Your Email</h2>
        <p className="text-gray-600">
          We've sent you a verification link. Please check your inbox and click
          the link to verify your account.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
        <p className="font-medium text-blue-900 mb-1">What's next?</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>Open your email inbox</li>
          <li>Find the verification email from Eco3d.shop</li>
          <li>Click the verification link</li>
          <li>Complete your profile setup</li>
        </ol>
      </div>

      <div className="pt-4">
        <Link href="/sign-in">
          <Button variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
