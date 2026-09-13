// src/app/about/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'About Us | SlashDeals',
  description: 'Learn more about SlashDeals — Nigeria’s secure, escrow-backed marketplace.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-sm space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            About SlashDeals
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight mt-4">
            Zero-Fraud Marketplace for Nigeria.
          </h1>
        </div>

        <p className="text-gray-600 text-lg leading-relaxed">
          SlashDeals is built to eliminate peer-to-peer marketplace scams. Whether you are buying a SaaS business, acquiring a social media channel, or scoring discounted physical goods, every deal is protected by automated escrow vaults.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-2xl mb-2 block">🛡️</span>
            <h3 className="font-bold text-gray-900">48-Hr Escrow</h3>
            <p className="text-sm text-gray-500 mt-1">Sellers only get paid when buyers verify and approve handover.</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-2xl mb-2 block">⭐</span>
            <h3 className="font-bold text-gray-900">Earned Trust</h3>
            <p className="text-sm text-gray-500 mt-1">Reputation is earned through verified sales, never bought.</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-2xl mb-2 block">⚡</span>
            <h3 className="font-bold text-gray-900">Instant Payouts</h3>
            <p className="text-sm text-gray-500 mt-1">Automated fiat bank payouts via Paystack and global stablecoin options.</p>
          </div>
        </div>

        <div className="pt-6 flex gap-4">
          <Link
            href="/"
            className="bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Explore Deals &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}