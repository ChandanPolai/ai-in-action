import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { loginAdminThunk, clearError } from '../store/slices/authSlice';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { adminToken, loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: '', password: '' });

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  if (adminToken) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginAdminThunk(form));
    if (loginAdminThunk.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI in Action</h1>
          <p className="text-slate-500 mt-2 text-sm">Admin Panel — Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="card-aesthetic p-6 sm:p-8 space-y-5">
          <Input
            label="Email"
            type="email"
            name="email"
            icon={Mail}
            required
            placeholder="Enter email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            icon={Lock}
            required
            placeholder="Enter password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit" fullWidth disabled={loading} size="lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
