import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

import Providers from "@/providers/Providers";
import Footer from "@/components/Layout/Footer";
import { poppins } from "@/styles/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Eco3D",
  description:
    "Discover eco-friendly 3D printed products made with biodegradable PHA at Eco3D",
  authors: { name: "Aaron Gazzola" },
  keywords:
    "3D printing, eco-friendly, biodegradable, PHA, sustainable products",
  robots: "index, follow",
  openGraph: {
    title: "Eco3D",
    description:
      "Explore sustainable 3D printed products made with biodegradable PHA at Eco3D",
    type: "website",
    url: "https://eco3d.shop",
    siteName: "Eco3D",
    images: "https://eco3d.shop/images/logo.png",
    locale: "en_US",
  },
};

// TODO: update theme color
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={
          (cn(poppins.className), "flex flex-col  antialiased min-h-screen")
        }
      >
        <Providers>
          <main className="min-h-screen flex flex-col gap-5 items-center justify-center">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
