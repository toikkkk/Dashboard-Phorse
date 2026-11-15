import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { PenyediaData } from "@/lib/data";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Dashboard Environment JBN",
  description: "Monitoring data lingkungan (ESG aspek Enviro) Regional Jatimbalinus.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <PenyediaData>
          <div className="mx-auto w-full max-w-[1600px] sm:p-4 lg:p-6">
            <div className="relative min-h-screen overflow-clip bg-canvas sm:min-h-[calc(100vh-3rem)] sm:rounded-[2rem] sm:shadow-[0_30px_80px_-30px_rgba(20,70,150,0.45)]">
              <Sidebar />
              <div className="pb-24 lg:pb-8 lg:pl-28">
                <Topbar />
                <main className="px-4 pb-6 sm:px-8">{children}</main>
              </div>
            </div>
          </div>
        </PenyediaData>
      </body>
    </html>
  );
}
