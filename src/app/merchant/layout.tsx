import Link from 'next/link';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <Link href="/" className="text-xl font-black text-gray-900 tracking-tight">
            SlashDeals <span className="text-blue-600">Pro</span>
          </Link>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          <Link href="/merchant" className="block px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 font-medium">
            Dashboard
          </Link>
          <Link href="/merchant/wallet" className="block px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors">
            Wallet & Billing
          </Link>
          <Link href="/merchant/auction" className="block px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors">
            Ad Auctions
          </Link>
          <Link href="/merchant/orders" className="block px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors">
            Escrow Orders
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}