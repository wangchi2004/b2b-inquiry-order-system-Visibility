import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "B2B Inquiry Order System",
  description: "A B2B inquiry and order submission system for overseas customers."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
