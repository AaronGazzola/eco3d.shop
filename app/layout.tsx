"use client";

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, Roboto_Mono } from 'next/font/google'
import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <html lang="en" className={`${fontPlus_Jakarta_Sans.variable} ${fontLora.variable} ${fontRoboto_Mono.variable}`}>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </body>
    </html>
  );
}
