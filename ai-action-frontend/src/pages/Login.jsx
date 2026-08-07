import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserRound, Lock, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { loginUserThunk, clearError } from '../store/slices/authSlice';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userToken, loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ identifier: '', password: '' });

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  if (userToken) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(
      loginUserThunk({
        identifier: form.identifier.trim(),
        password: form.password
      })
    );
    if (loginUserThunk.fulfilled.match(result)) {
      toast.success('Welcome!');
      navigate('/dashboard');
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">AI in Action</h1>
          <p className="text-sky-100/90 mt-2 text-sm flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Student Portal — join live sessions &amp; learn
          </p>
        </div>

        <form onSubmit={handleSubmit} className="student-auth-panel rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Login with email or mobile number</p>
          </div>

          <Input
            label="Email or Mobile"
            type="text"
            icon={UserRound}
            required
            placeholder="email@example.com or 9876543210"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          />
          <div className="space-y-1.5">
            <Input
              label="Password"
              type="password"
              icon={Lock}
              required
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" fullWidth disabled={loading} size="lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
