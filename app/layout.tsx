import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, Roboto_Mono } from 'next/font/google'
import "./globals.css";

const fontPlus_Jakarta_Sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
})

const fontLora = Lora({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-lora',
})

const fontRoboto_Mono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
})

export const metadata: Metadata = {
  title: "Eco3d.shop",
  description: "3D printing marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontPlus_Jakarta_Sans.variable} ${fontLora.variable} ${fontRoboto_Mono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
