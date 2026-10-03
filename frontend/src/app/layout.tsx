import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Dietary Guidance ChatBot — Official Food & Nutrition Guidance',
  description:
    'Ask questions about food safety, nutrition, and healthy eating — powered by WHO, NHS, USDA, and FAO official documents.',
  keywords: ['food safety', 'nutrition', 'dietary guidance', 'healthy eating', 'WHO', 'NHS', 'USDA'],
  openGraph: {
    title: 'Dietary Guidance ChatBot',
    description: 'AI-powered chatbot grounded in official food & nutrition guidelines.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-container-lowest font-body-md text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
