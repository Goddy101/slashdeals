// src/components/Navbar.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Navbar() {
  const supabase = await createClient();
  
  // Securely check if the user is currently logged in on the server
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* 1. Left Side: Brand Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-gray-900">
             Slash<span className="text-blue-600">Deals</span>
            </span>
          </Link>

          {/* 2. Right Side: Links & CTAs */}
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* Smart Login/Dashboard Link */}
            {user ? (
              <Link 
                href="/merchant/dashboard" 
                className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="text-sm font-bold text-gray-600 hover:text-black transition-colors hidden sm:block"
              >
                Merchant Login
              </Link>
            )}

            {/* Post Deal Button (Always Visible) */}
            <Link 
              href="/merchant/post" 
              className="bg-black text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-md"
            >
              + Post Deal
            </Link>
            
          </div>
        </div>
      </div>
    </nav>
  );
}