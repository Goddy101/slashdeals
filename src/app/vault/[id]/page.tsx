// app/vault/[id]/page.tsx
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { notFound, redirect } from 'next/navigation';
import HandoverClientViewComponent from '@/components/Escrow/HandoverClientView';
type HandoverClientViewProps = {
  escrow: {
    id: string;
    status: string;
    amount: number;
    inspection_expires_at: string | null;
    listings?: Array<{ title: string; price: number; images: string[] | null }>;
  };
  orderOtp: string;
  trackingCode: string;
  isBuyer: boolean;
  isAdmin: boolean;
  initialMessages: Array<{
    id: string;
    message: string;
    is_admin: boolean;
    created_at: string;
    sender_id: string;
  }>;
};

function HandoverClientView({
  escrow,
  orderOtp,
  trackingCode,
}: HandoverClientViewProps) {
  const listing = escrow.listings?.[0];

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div>
        <h2 className="text-xl font-bold">{listing?.title || 'Escrow transaction'}</h2>
        <p className="text-sm text-zinc-400">Status: {escrow.status}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-zinc-500">Amount</p>
          <p className="font-semibold">{escrow.amount}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Tracking code</p>
          <p className="font-semibold">{trackingCode}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Delivery OTP</p>
          <p className="font-semibold">{orderOtp}</p>
        </div>
      </div>
    </section>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HandoverRoomPage({ params }: PageProps) {
  // 1. Await params explicitly for Next.js production builds
  const { id } = await params;
  if (!id) notFound();

  const cookieStore = await cookies();

  // 2. Authenticate User securely via Cookie Session
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) redirect('/login');

  // 3. Initialize Admin Client to bypass row limits/RLS safely for verified participants
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; } } }
  );

  // 4. Fetch Escrow and Listing details with absolute relation accuracy
  const { data: escrow, error: escrowError } = await supabaseAdmin
    .from('escrows')
    .select(`
      id,
      amount,
      status,
      funded_at,
      inspection_expires_at,
      gateway_reference,
      buyer_id,
      seller_id,
      listing_id,
      listings ( id, title, price, images )
    `)
    .eq('id', id)
    .single();

  if (escrowError || !escrow) notFound();

  // 5. Hard Security Boundary: Only allow Buyer, Seller, or System Admin
  const isBuyer = escrow.buyer_id === user.id;
  const isSeller = escrow.seller_id === user.id;

  // Check if user is an admin if they are neither buyer nor seller
  let isAdmin = false;
  if (!isBuyer && !isSeller) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role === 'admin') {
      isAdmin = true;
    } else {
      redirect('/');
    }
  }

  // 6. Fetch associated order safely using escrow's listing reference
  const targetListingId = escrow.listing_id || escrow.listings?.[0]?.id;
  const { data: order } = await supabaseAdmin
    .from('escrows')
    .select('delivery_otp, tracking_code, delivery_details')
    .eq('deal_id', targetListingId)
    .maybeSingle();

  // 7. Fetch live dispute message log if the vault is under review
  const { data: disputeMessages } = await supabaseAdmin
    .from('dispute_messages')
    .select(`
      id,
      message,
      is_admin,
      created_at,
      sender_id
    `)
    .eq('escrow_id', escrow.id)
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <span className="text-emerald-400 text-xs font-black uppercase tracking-widest bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-900/50">
              🛡️ Secure Escrow Vault {isAdmin && '(Admin Mode)'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">Handover Room</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-mono">Vault Reference</p>
            <p className="text-xs font-bold text-zinc-300 font-mono">{escrow.gateway_reference}</p>
          </div>
        </div>

        {/* Client Interactive View with Full Telemetry */}
        <HandoverClientView 
          escrow={escrow} 
          orderOtp={order?.delivery_otp || '----'} 
          trackingCode={order?.tracking_code || 'TRK-XXXX'} 
          isBuyer={isBuyer}
          isAdmin={isAdmin}
          initialMessages={disputeMessages || []}
        />

      </div>
    </div>
  );

 
}