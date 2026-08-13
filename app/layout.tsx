import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Лист персонажа Ultima Forsan",
  description: "Анкета, которая превращается в красивый печатный лист персонажа для Ultima Forsan и SWADE.",
  openGraph: {
    title: "Лист персонажа Ultima Forsan",
    description: "Лист персонажа без писарской муки - заполните анкету и сохраните две красивые страницы A4.",
    images: [{ url: "/og.png", width: 1672, height: 939 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Лист персонажа Ultima Forsan",
    description: "Анкета, которая превращается в готовый печатный лист персонажа.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
