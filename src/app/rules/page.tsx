// src/app/rules/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Platform Rules | SlashDeals',
  description: 'Community guidelines and marketplace rules for SlashDeals.',
};

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-sm space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Marketplace Guidelines
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight mt-4">
            Platform Rules.
          </h1>
        </div>

        <div className="space-y-6 text-gray-600 text-base leading-relaxed">
          <p>
            To maintain a high-trust environment, all merchants and buyers on SlashDeals must adhere to the following core rules:
          </p>
          
          <ul className="list-disc pl-5 space-y-3 font-medium text-gray-700">
            <li><strong>Zero Tolerance for Fraud:</strong> Attempting to bypass the Escrow system or submitting fake credentials will result in an immediate, permanent ban.</li>
            <li><strong>Accurate Descriptions:</strong> Digital assets and physical goods must match their descriptions exactly. Misleading listings will be removed.</li>
            <li><strong>Communication:</strong> All dispute resolution communications must remain professional and occur within the SlashDeals platform.</li>
            <li><strong>Prohibited Items:</strong> No illegal goods, stolen accounts, or unauthorized copyrighted materials.</li>
          </ul>

          <p className="pt-4 border-t border-gray-100">
            These rules are enforced by our automated Trust Engine and manual admin reviews.
          </p>
        </div>

        <div className="pt-6">
          <Link
            href="/"
            className="bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors inline-block"
          >
            Back to Feed &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}