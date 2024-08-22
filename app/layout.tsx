import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

import Providers from "@/providers/Providers";
import Footer from "@/components/Layout/Footer";
import { poppins } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import Header from "@/components/Layout/Header";
import LogoBackground from "@/components/svg/LogoBackground";
import Image from "next/image";
import { comfortaa } from "@/styles/fonts";

// comment

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
            <div className="relative">
              <div className="hidden dark:block absolute inset-0 -z-10 scale-y-[1.03]">
                <LogoBackground className="fill-white stroke-white" />
              </div>
              <Image
                src="/images/logo.png"
                alt="Eco3d logo"
                width={640}
                height={508}
                className="w-24 z-20"
              />
            </div>
            <div className="relative">
              <h1
                className={cn(
                  "absolute inset-0 translate-x-1 translate-y-1 text-gray-200 dark:text-gray-800 text-2xl tracking-wider font-black mt-1 -z-10",
                  comfortaa.className
                )}
              >
                Eco3D
              </h1>
              <h1
                className={cn(
                  "dark:text-gray-100 text-2xl tracking-wider font-black mt-1 ",
                  comfortaa.className
                )}
              >
                Eco3D
              </h1>
            </div>
            <p>100% Biodegradable 3D Printed Products</p>
            <p>Coming soon</p>
          </main>
          {/* <Header />
          <main className="flex-grow">{children}</main>
          <Footer /> */}
        </Providers>
      </body>
    </html>
  );
}
