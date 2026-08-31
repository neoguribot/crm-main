import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { NotificationPopup } from "@/components/notification-popup";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-background antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* 저장된 테마·글씨 크기를 페인트 전에 적용해 깜빡임을 막는다. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('crm:theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}try{var s=localStorage.getItem('crm:font-scale');if(s){var n=parseFloat(s);if(n>=0.8&&n<=1.6&&n!==1)document.documentElement.style.fontSize=Math.round(n*100)+'%';}}catch(e){}",
          }}
        />
        <AppNav />
        {children}
        <NotificationPopup />
      </body>
    </html>
  );
}
