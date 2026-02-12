import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 relative">
          <Link href="/" className="absolute top-4 left-4">
            <Button variant="link" size="sm" className="px-0 h-auto">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
          </Link>

          <div className="mb-6 text-center">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold text-green-600">Eco3d.shop</h1>
            </Link>
            <p className="text-sm text-gray-600 mt-1">
              Sustainable 3D Design & Printing
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
