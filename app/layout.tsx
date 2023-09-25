import { fontSans } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import "@/styles/globals.css";
import clsx from "clsx";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }} session={session}>
          <div className="relative flex flex-col h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
