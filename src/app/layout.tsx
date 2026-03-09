import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EstudaAI",
  description: "Plataforma inteligente para gerenciar e otimizar seus estudos.",
};


import { DocumentProvider } from "@/contexts/DocumentContext";
import { ExamProvider } from "@/contexts/ExamContext";
import { EnemExamProvider } from "@/contexts/EnemExamContext";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

import { SessionProvider } from "@/components/auth/SessionProvider";
import { MainLayoutWrapper } from "@/components/layout/MainLayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ExamProvider>
              <EnemExamProvider>
                <DocumentProvider>
                  <MainLayoutWrapper>{children}</MainLayoutWrapper>
                </DocumentProvider>
              </EnemExamProvider>
            </ExamProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
