// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

// 1. Optimize Fonts (Prevents layout shift on load)
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// 2. Global SEO & Open Graph Metadata
export const metadata: Metadata = {
  title: 'SlashDeals | Nigeria’s Escrow-Protected Marketplace',
  description: 'Buy and sell premium digital assets and physical goods securely. Never pay full price. Never get scammed.',
  metadataBase: new URL(process.env.NEXT_SITE_URL || 'https://slashdeals.com.ng'),
  openGraph: {
    title: 'SlashDeals | Buy & Sell Securely',
    description: 'The premier marketplace for Escrow-protected deals.',
    url: '/',
    siteName: 'SlashDeals',
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased selection:bg-emerald-500/30 selection:text-emerald-900`}>
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans">
        
        {/* Your Global Navbar goes here (Make sure it has mobile responsiveness!) */}
        {/* <Navbar /> */}

        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Global Toast Notifications (replaces alert()) */}
        <Toaster 
          position="bottom-center" 
          toastOptions={{
            className: 'font-bold font-sans rounded-xl',
            style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' }
          }} 
        />
      </body>
    </html>
  );
}







// import type { Metadata } from 'next';
// import { Inter } from 'next/font/google';
// import './globals.css';
// import Navbar from '@/components/Navbar'; // <-- 1. Import the new Navbar

// const inter = Inter({ subsets: ['latin'] });

// export const metadata: Metadata = {
//   title: 'SlashDeals | Premium Deals & Awoof',
//   description: 'Find the best verified discounts across Nigeria.',
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en">
//       <body className={inter.className}>
//         {/* You can add a global Navbar here later */}
//         {children}
//       </body>
//     </html>
//   );
// }