import type { Metadata } from "next";
import AuthGuard from "./auth-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clannect - Community Hub",
  description: "Join the ultimate gaming community platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
