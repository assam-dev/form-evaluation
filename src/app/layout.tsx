import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./(website)/component/layout/Navbar/page";
import Footer from "./(website)/component/layout/Footer/page";

export const metadata: Metadata = {
  title: "AuditLens | Google Form Evaluation",
  description: "AI-assisted audit of student submissions collected through Google Forms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
      <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      <Footer />
      </body>
    </html>
  );
}
