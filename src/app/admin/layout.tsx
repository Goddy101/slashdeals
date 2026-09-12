// src/app/admin/layout.tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  // 1. GLOBAL ADMIN SECURITY CHECK
  // This protects EVERY page inside the /admin folder automatically.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/merchant/dashboard'); // Kick non-admins back to the merchant dashboard
  }

  return (
    <div className="min-h-screen bg-[#090E17] flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">
      
      {/* 2. ADMIN SIDEBAR (Desktop) / TOP NAV (Mobile) */}
      <aside className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 shrink-0 sticky top-0 z-50">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-black text-xl">
              S
            </div>
            <span className="text-xl font-black text-white tracking-tight">SlashAdmin</span>
          </Link>
        </div>

        <nav className="px-4 pb-6 md:pb-0 space-y-1 flex md:flex-col overflow-x-auto md:overflow-visible">
          
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shrink-0">
            <span>📊</span> Overview
          </Link>

          <Link href="/admin/escrows" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shrink-0">
            <span>🛡️</span> Escrow Vaults
          </Link>

          <Link href="/admin/deals" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shrink-0">
            <span>🛒</span> Manage Deals
          </Link>

          <div className="md:mt-8 pt-4 md:border-t border-zinc-800/50">
            <p className="px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 hidden md:block">System</p>
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shrink-0">
              <span>🏠</span> Back to App
            </Link>
          </div>
          
        </nav>
      </aside>

      {/* 3. MAIN CONTENT AREA */}
      {/* The `page.tsx` we just wrote will automatically render inside {children} here */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
      
    </div>
  );
}



// // app/admin/layout.tsx
// import { redirect } from 'next/navigation';
// import { cookies } from 'next/headers';
// import { createServerClient } from '@supabase/ssr';
// import Link from 'next/link';

// export default async function AdminLayout({ children }: { children: React.ReactNode }) {
//   const cookieStore = await cookies();

//   // 1. Initialize the secure SSR client to read HTTP-only cookies
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return cookieStore.getAll();
//         },
//       },
//     }
//   );

//   // 2. Validate the session token directly on the server
//   const { data: { user }, error: authError } = await supabase.auth.getUser();

//   // If there is no valid session, redirect to login
//   if (authError || !user) {
//     redirect('/login');
//   }

//   // 3. Verify the user has the 'admin' role in the database
//   const { data: profile, error: profileError } = await supabase
//     .from('profiles')
//     .select('role')
//     .eq('id', user.id)
//     .single();

//   // If they are not an admin, immediately kick them back to the public homepage
//   if (profileError || profile?.role !== 'admin') {
//     redirect('/');
//   }

//   // 4. Render the secure Admin UI
//   return (
//     <div className="min-h-screen bg-zinc-950 flex">
//       {/* Sidebar Navigation */}
//       <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
//         <div className="p-6 border-b border-zinc-800">
//           <h1 className="text-xl font-black text-white">
//             SlashDeals <span className="text-emerald-500">Admin</span>
//           </h1>
//         </div>
//         <nav className="flex-1 p-4 space-y-2">
//           <Link href="/admin" className="block px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-semibold">
//             📊 Overview
//           </Link>
//           <Link href="/admin/escrows" className="block px-4 py-3 rounded-xl text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 font-bold transition-all">
//             🛡️ Escrow Vaults
//           </Link>
//           <Link href="/admin/users" className="block px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-semibold">
//             ✅ Vendor Verifications
//           </Link>
//         </nav>
//       </aside>

//       {/* Main Content Area */}
//       <main className="flex-1 overflow-y-auto">
//         <header className="bg-zinc-900/50 border-b border-zinc-800 p-6 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
//           <h2 className="text-xl font-bold text-white">Command Center</h2>
//           <div className="flex items-center gap-3">
//             <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
//             <span className="text-sm font-semibold text-zinc-300">System Online</span>
//           </div>
//         </header>
//         <div className="p-8">
//           {children}
//         </div>
//       </main>
//     </div>
//   );
// }