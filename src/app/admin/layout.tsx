// app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  // 1. Initialize the secure SSR client to read HTTP-only cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // 2. Validate the session token directly on the server
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If there is no valid session, redirect to login
  if (authError || !user) {
    redirect('/login');
  }

  // 3. Verify the user has the 'admin' role in the database
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If they are not an admin, immediately kick them back to the public homepage
  if (profileError || profile?.role !== 'admin') {
    redirect('/');
  }

  // 4. Render the secure Admin UI
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-black text-white">
            SlashDeals <span className="text-emerald-500">Admin</span>
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="block px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-semibold">
            📊 Overview
          </Link>
          <Link href="/admin/escrows" className="block px-4 py-3 rounded-xl text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 font-bold transition-all">
            🛡️ Escrow Vaults
          </Link>
          <Link href="/admin/users" className="block px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-semibold">
            ✅ Vendor Verifications
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-zinc-900/50 border-b border-zinc-800 p-6 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold text-white">Command Center</h2>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
            <span className="text-sm font-semibold text-zinc-300">System Online</span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}