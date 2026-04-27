import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/authOptions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACME Policy Violation Demo",
  description: "Conference demo for resolving Identity Security Cloud policy violations",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className={inter.className}>
        <AntdRegistry>
          <Providers session={session}>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
