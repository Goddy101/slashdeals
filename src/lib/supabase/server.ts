// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 1. MUST BE ASYNC to support modern Next.js environments
export async function createClient() {
  const cookieStore = await cookies(); // <-- ADDED AWAIT HERE

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored if called from a Server Component
          }
        },
      },
    }
  );
}

// Service role client for protected cron tasks & admin endpoints
// (This can remain sync since it doesn't read the dynamic cookie store)
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}









// import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import { cookies } from 'next/headers';

// export function createClient() {
//   const cookieStore = cookies();

//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return cookieStore.getAll();
//         },
//         // FIX: Added explicit types here
//         setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
//           try {
//             cookiesToSet.forEach(({ name, value, options }) =>
//               cookieStore.set(name, value, options)
//             );
//           } catch {
//             // Can be ignored if called from a Server Component
//           }
//         },
//       },
//     }
//   );
// }

// // Service role client for protected cron tasks & admin endpoints
// export function createAdminClient() {
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return [];
//         },
//         setAll() {},
//       },
//     }
//   );
// }