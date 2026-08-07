import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await postRequest('/user/auth/reset-password', {
        token,
        newPassword: form.newPassword
      });
      toast.success('Password updated. Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Reset Password</h1>
          <p className="text-sky-100/90 mt-2 text-sm">Choose a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="student-auth-panel rounded-2xl p-6 sm:p-8 space-y-5">
          {!token && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              This reset link is missing or invalid. Request a new one from the forgot password page.
            </p>
          )}
          <Input
            label="New Password"
            type="password"
            icon={Lock}
            required
            placeholder="At least 6 characters"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          <Input
            label="Confirm Password"
            type="password"
            icon={Lock}
            required
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <Button type="submit" fullWidth disabled={loading || !token} size="lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
          </Button>
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
