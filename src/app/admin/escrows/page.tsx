// app/admin/escrows/page.tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function PayoutButton({ escrowId }: { escrowId: string }) {
  return (
    <button
      type="button"
      data-escrow-id={escrowId}
      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold px-4 py-2 rounded-lg text-xs transition-all border border-emerald-500/20"
    >
      Payout
    </button>
  );
}

export default async function AdminEscrowsPage() {
  // Fetch all active and recent escrows
  const { data: escrows } = await supabase
    .from('escrows')
    .select(`
      id,
      amount,
      status,
      gateway,
      created_at,
      gateway_reference,
      listings ( title )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white">Escrow Vaults</h1>
          <p className="text-zinc-400 mt-2">Manage liquidity, resolve disputes, and disburse payouts.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="p-4 font-semibold">Ref / Item</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Gateway</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {escrows?.map((escrow) => (
              <tr key={escrow.id} className="hover:bg-zinc-800/30 transition-colors">
                
                {/* Item Details */}
                <td className="p-4">
                  <p className="font-bold text-white mb-1 truncate max-w-[200px]">
                    {/* Assuming listings might return an array or single object based on your schema */}
                    {Array.isArray(escrow.listings) 
                      ? escrow.listings[0]?.title 
                      : (escrow.listings as any)?.title || 'Unknown Asset'}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">{escrow.gateway_reference}</p>
                </td>

                {/* Amount */}
                <td className="p-4 font-black text-white">
                  ₦{escrow.amount.toLocaleString()}
                </td>

                {/* Gateway Badge */}
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    escrow.gateway === 'paystack' 
                      ? 'bg-blue-950 text-blue-400 border border-blue-800' 
                      : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                  }`}>
                    {escrow.gateway}
                  </span>
                </td>

                {/* Status Badge */}
                <td className="p-4">
                  {escrow.status === 'funded' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold border border-emerald-800">
                      🟢 Funded (Active)
                    </span>
                  )}
                  {escrow.status === 'awaiting_payment' && (
                    <span className="px-2.5 py-1 rounded-full bg-yellow-950 text-yellow-400 text-xs font-bold border border-yellow-800">
                      🟡 Pending
                    </span>
                  )}
                  {escrow.status === 'completed' && (
                    <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-700">
                      ✅ Payout Sent
                    </span>
                  )}
                  {escrow.status === 'disputed' && (
                    <span className="px-2.5 py-1 rounded-full bg-red-950 text-red-400 text-xs font-bold border border-red-800">
                      🚨 Disputed
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="p-4 text-right">
                  {escrow.status === 'funded' ? (
                    <div className="flex justify-end gap-2">
                      
                      {/* Integrated Interactive Payout Button */}
                      <PayoutButton escrowId={escrow.id} />
                      
                      <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold px-4 py-2 rounded-lg text-xs transition-all border border-red-500/20">
                        Refund
                      </button>
                    </div>
                  ) : (
                    <button disabled className="bg-zinc-800 text-zinc-500 font-bold px-4 py-2 rounded-lg text-xs cursor-not-allowed">
                      No Action Required
                    </button>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {escrows?.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No active escrows in the vault right now.
          </div>
        )}
      </div>
    </div>
  );
}