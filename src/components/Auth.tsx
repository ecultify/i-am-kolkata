import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useStore } from '../store/useStore';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const setUser = useStore(state => state.setUser);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });

        if (signUpError) throw signUpError;
        if (signUpData.user) {
          setUser(signUpData.user);
          // Show welcome message for new users
          alert('Welcome to I Am Kolkata! Start by sharing your para story.');
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
        if (signInData.user) setUser(signInData.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'signin' ? 'Welcome Back!' : 'Join I Am Kolkata'}
          </h2>
          <p className="text-gray-600 mt-2">
            {mode === 'signin' 
              ? 'Sign in to continue your para journey'
              : 'Create an account to share your para story'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="mt-1 relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm 
                         focus:border-rose-500 focus:ring-rose-500"
                required
              />
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm 
                         focus:border-rose-500 focus:ring-rose-500"
                required
                minLength={6}
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-rose-600 
                     text-white py-2 px-4 rounded-md hover:bg-rose-700 
                     transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-rose-600 hover:text-rose-700"
            >
              {mode === 'signin' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};