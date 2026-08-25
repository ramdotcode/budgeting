import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Budgeting",
  description: "Atur pemasukan, budget bulanan, dan pengeluaranmu",
  appleWebApp: {
    capable: true,
    title: "Budgeting",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#65a30d",
};

// Jalan sebelum paint pertama supaya tema tersimpan langsung terpakai tanpa flash
const themeScript = `try{var t=localStorage.getItem("theme");var m=matchMedia("(prefers-color-scheme: dark)");var c=document.documentElement.classList;c.toggle("dark",t==="dark"||(!t&&m.matches));m.addEventListener("change",function(e){if(!localStorage.getItem("theme"))c.toggle("dark",e.matches)})}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-gray-50 font-sans text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
