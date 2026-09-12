// app/admin/withdrawals/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ApproveButton } from './ApproveButton';

export const metadata = {
  title: 'Admin Payouts | SlashDeals',
};

export default async function AdminWithdrawalsPage() {
  const supabase = await createClient();

  // 1. Verify Admin Session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  // 2. Fetch all pending withdrawals
  const { data: pendingWithdrawals, error } = await supabase
    .from('wallet_transactions')
    .select('*, profiles(business_name, account_name, email)')
    .eq('type', 'withdrawal')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const totalPendingAmount = pendingWithdrawals?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Withdrawal Requests</h1>
          <p className="text-gray-500 font-medium mt-1">Manage and disburse merchant wallet funds.</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-6 py-3 rounded-2xl text-right">
          <p className="text-xs font-bold uppercase tracking-wider mb-1">Total Pending</p>
          <p className="text-2xl font-black">₦{totalPendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {(!pendingWithdrawals || pendingWithdrawals.length === 0) ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-gray-900">Inbox Zero!</h3>
            <p className="text-gray-500 font-medium">No pending withdrawal requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Merchant</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Amount</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Bank Details</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Requested</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingWithdrawals.map((tx) => {
                  const metadata = tx.metadata as any;
                  const merchantName = tx.profiles?.business_name || tx.profiles?.account_name || 'Unknown Merchant';
                  
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{merchantName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{tx.profiles?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-lg text-gray-900">₦{tx.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🏦</span>
                          <div>
                            <p className="font-bold text-gray-900 font-mono">{metadata?.account_number}</p>
                            <p className="text-xs text-gray-500">{metadata?.bank_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {new Date(tx.created_at).toLocaleDateString()}
                        <div className="text-xs mt-0.5">
                          {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 flex justify-end items-center">
                        <ApproveButton 
                          transactionId={tx.id} 
                          amount={tx.amount} 
                          merchantName={merchantName} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}