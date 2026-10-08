import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginButton from '../components/auth/LoginButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, signup, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    }
  };

  const handleGoogle = async () => {
    try {
      setError('');
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Google sign-in failed.');
    }
  };

  const handleDemo = async () => {
    try {
      setError('');
      const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
      const demoPass = import.meta.env.VITE_DEMO_PASSWORD;
      if (!demoEmail || !demoPass) {
        setError('Demo credentials not configured.');
        return;
      }
      await login(demoEmail, demoPass);
      navigate('/');
    } catch (err) {
      setError('Demo sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">OnboardIQ</h2>
          <p className="text-sm text-slate-500 mt-2">{isSignUp ? 'Create your workspace' : 'Sign in to your workspace'}</p>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="pt-2">
            <LoginButton disabled={loading} text={isSignUp ? "Sign Up" : "Sign In"} />
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Google
            </button>
            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Demo
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? (
            <>Already have an account? <button onClick={() => setIsSignUp(false)} className="text-indigo-600 font-medium hover:text-indigo-500">Sign in</button></>
          ) : (
            <>Don't have an account? <button onClick={() => setIsSignUp(true)} className="text-indigo-600 font-medium hover:text-indigo-500">Sign up</button></>
          )}
        </div>
      </div>
    </div>
  );
}
