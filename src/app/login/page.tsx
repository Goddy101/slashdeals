'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) handleRedirect();
    });
  }, [supabase]);

  const handleRedirect = () => {
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectAfterLogin');
      router.push(redirectUrl);
    } else {
      router.push('/merchant/orders'); // Default dashboard
    }
  };

  // 1-Click Google Auth
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // Supabase handles the redirect automatically
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google login.');
      setLoading(false);
    }
  };

  // Fallback Email/Password Auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      handleRedirect();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-200 shadow-xl">
        
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black tracking-tighter text-black hover:opacity-80">
            Slash<span className="text-red-600">Deals</span>
          </Link>
          <p className="text-gray-500 font-medium mt-2">
            Sign in to start slashing prices or buying safely.
          </p>
        </div>

        {/* Primary Action: 1-Click Google Login */}
        <button 
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative flex items-center py-2 mb-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-bold uppercase tracking-wider">Or use email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Fallback Action: Simple Email Login */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
              placeholder="Email address"
            />
          </div>

          <div>
            <input 
              type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
              placeholder="Password (min. 6 characters)"
            />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-lg border border-red-100 text-center">{error}</div>}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 text-lg"
          >
            {loading ? '...' : (isSignUp ? 'Sign Up with Email' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-sm font-bold text-gray-500 hover:text-black underline transition-colors"
          >
            {isSignUp ? 'I already have an account' : 'I need to create an account'}
          </button>
        </div>

      </div>
    </div>
  );
}