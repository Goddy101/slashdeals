// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar'; // <-- 1. Import the new Navbar

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SlashDeals | Premium Deals & Awoof',
  description: 'Find the best verified discounts across Nigeria.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Global Sticky Navbar */}
        <Navbar />
        
        <main>
          {children}
        </main>
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