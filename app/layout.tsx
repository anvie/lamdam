import MainNavbar from "@/components/MainNavbar";
import fonts from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={fonts.join(' ')} suppressHydrationWarning>
      <head />
      <body className="min-h-screen max-h-screen overflow-hidden lamdam-light dark:lamdam-dark bg-background text-foreground font-sans antialiased">
        <Providers
          themeProps={{ attribute: "class", defaultTheme: "light" }}
          session={session}
        >
          <MainNavbar />
          <main className="h-[calc(100vh-65px)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
