import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { setSession, fetchProfileThunk, logout } from '../store/slices/authSlice';

/**
 * Admin "login as user" landing page.
 * Expects ?token=<userJwt> then opens My Profile.
 */
const Impersonate = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Signing you in...');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = searchParams.get('token');
      if (!token) {
        toast.error('Invalid login link');
        navigate('/login', { replace: true });
        return;
      }

      try {
        dispatch(logout());
        dispatch(setSession({ userToken: token }));
        const result = await dispatch(fetchProfileThunk());
        if (cancelled) return;

        if (fetchProfileThunk.fulfilled.match(result)) {
          toast.success(`Logged in as ${result.payload.data?.user?.name || 'user'}`);
          navigate('/profile', { replace: true });
        } else {
          setMessage('Login failed');
          toast.error(result.payload || 'Could not login as user');
          navigate('/login', { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Could not login as user');
          navigate('/login', { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="flex items-center gap-3 text-slate-600 font-semibold">
        <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        {message}
      </div>
    </div>
  );
};

export default Impersonate;
