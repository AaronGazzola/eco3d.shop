import type { Metadata } from "next";

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
