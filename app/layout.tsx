import MainNavbar from "@/components/MainNavbar";
import { siteConfig } from "@/config/site";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import "@/styles/globals.css";
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
  viewport: "width=device-width, initial-scale=1, user-scalable=no",
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
      <body className="min-h-screen lamdam-light dark:lamdam-dark bg-background text-foreground font-sans antialiased">
        <Providers
          themeProps={{ attribute: "class", defaultTheme: "light" }}
          session={session}
        >
          <MainNavbar />
          <main className="min-h-full">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
