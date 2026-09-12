// app/dashboard/settings/bank/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getNigerianBanks, verifyBankAccount, saveBankDetails } from './actions';

export default function BankSettingsPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  
  // Form State
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  // Verification State
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load Banks on Mount
  useEffect(() => {
    async function fetchBanks() {
      try {
        const bankList = await getNigerianBanks();
        setBanks(bankList);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingBanks(false);
      }
    }
    fetchBanks();
  }, []);

  // Auto-Verify when 10 digits and Bank are selected
  useEffect(() => {
    async function verify() {
      if (accountNumber.length === 10 && bankCode) {
        setIsVerifying(true);
        setErrorMsg('');
        setAccountName('');
        
        try {
          const res = await verifyBankAccount(accountNumber, bankCode);
          if (res.success) {
            setAccountName(res.accountName);
          } else {
            setErrorMsg('Invalid account details. Please check your number and bank.');
          }
        } catch (error) {
          setErrorMsg('Network error. Could not verify account.');
        } finally {
          setIsVerifying(false);
        }
      } else {
        setAccountName('');
        setErrorMsg('');
      }
    }
    
    // Add a slight debounce so we don't spam the API on every keystroke
    const timer = setTimeout(() => verify(), 500);
    return () => clearTimeout(timer);
  }, [accountNumber, bankCode]);

  // Handle Bank Selection
  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const selectedBank = banks.find(b => b.code === code);
    setBankCode(code);
    setBankName(selectedBank?.name || '');
  };

  // Handle Save
  const handleSave = async (formData: FormData) => {
    setIsSaving(true);
    try {
      // Append the implicitly verified data to the form
      formData.append('bankName', bankName);
      formData.append('accountName', accountName);
      
      await saveBankDetails(formData);
      alert('✅ Bank Details Saved Successfully!');
    } catch (error: any) {
      alert(`❌ Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-black text-white">Payout Settings</h1>
        <p className="text-zinc-400 mt-2 text-sm">
          Where should we send your funds after a successful escrow handover?
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form action={handleSave} className="space-y-6">
          
          {/* Bank Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Select Bank
            </label>
            <select
              name="bankCode"
              value={bankCode}
              onChange={handleBankSelect}
              disabled={loadingBanks}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
              required
            >
              <option value="">{loadingBanks ? 'Loading Banks...' : '-- Select a Nigerian Bank --'}</option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Number Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Account Number (NUBAN)
            </label>
            <input
              type="text"
              name="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="0123456789"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              required
            />
          </div>

          {/* Verification Status UI */}
          <div className="min-h-[60px]">
            {isVerifying && (
              <div className="flex items-center gap-3 text-zinc-400 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-sm font-semibold">Resolving Account Name...</span>
              </div>
            )}
            
            {errorMsg && !isVerifying && (
              <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                <span>❌</span> {errorMsg}
              </div>
            )}

            {accountName && !isVerifying && !errorMsg && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 p-4 rounded-xl flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-xs text-emerald-500 uppercase tracking-wider font-bold mb-1">Account Verified</p>
                  <p className="text-white font-black text-lg">{accountName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-zinc-800">
            <button
              type="submit"
              disabled={!accountName || isVerifying || isSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-black py-4 rounded-xl transition-all shadow-lg"
            >
              {isSaving ? 'Saving...' : 'Save Payout Details'}
            </button>
            <p className="text-center text-xs text-zinc-500 mt-4">
              Payouts are processed instantly to this account upon successful escrow release.
            </p>
          </div>
          
        </form>
      </div>
    </div>
  );
}