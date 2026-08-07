import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await postRequest('/user/auth/forgot-password', { email });
      setSent(true);
      toast.success('Check your email for the reset link');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen student-auth-bg flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-10 w-80 h-80 rounded-full bg-blue-500/25 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-7">
          <div className="inline-flex justify-center mb-4">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur-sm">
              <Logo size="lg" showText={false} />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Forgot Password</h1>
          <p className="text-sky-100/90 mt-2 text-sm">We will email you a secure reset link</p>
        </div>

        <div className="student-auth-panel rounded-2xl p-6 sm:p-8 space-y-5">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-600 leading-relaxed">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent.
                The link is valid for 1 hour.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                icon={Mail}
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" fullWidth disabled={loading} size="lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
