import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import { fetchAdminProfileThunk } from '../store/slices/authSlice';
import { setAdminData } from '../utils/storage';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const SettingsPage = () => {
  const dispatch = useDispatch();
  const { admin } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState({ name: admin?.name || '', email: admin?.email || '' });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [defaultMaxPlayCount, setDefaultMaxPlayCount] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/admin/recordings/settings/get');
        setDefaultMaxPlayCount(res.data.defaultMaxPlayCount || 1);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await postRequest('/admin/auth/update-profile', profile);
      setAdminData(res.data);
      dispatch(fetchAdminProfileThunk());
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();

    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setSaving(true);
    try {
      await postRequest('/admin/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const savePlayLimit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await postRequest('/admin/recordings/settings/update', {
        defaultMaxPlayCount: Math.max(1, Number(defaultMaxPlayCount) || 1)
      });
      setDefaultMaxPlayCount(res.data.defaultMaxPlayCount);
      toast.success('Global play limit saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Manage your admin profile, password, and video play limits</p>
      </div>

      <Card title="Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <Input label="Name" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <Input label="Email" type="email" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          <Button type="submit" disabled={saving}>Save Profile</Button>
        </form>
      </Card>

      <Card
        title="Global video play limit"
        subtitle="Default max times each user can play a newly created recording (you can override per video)"
      >
        <form onSubmit={savePlayLimit} className="space-y-4">
          <Input
            label="Default max plays per user"
            type="number"
            min={1}
            required
            value={defaultMaxPlayCount}
            onChange={(e) => setDefaultMaxPlayCount(Math.max(1, Number(e.target.value) || 1))}
          />
          <Button type="submit" disabled={saving}>Save play limit</Button>
        </form>
      </Card>

      <Card
        title="Change Password"
        subtitle="Enter your current password, then set a new one"
      >
        <form onSubmit={changePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            placeholder="Your current password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          />
          <Input
            label="New Password"
            type="password"
            required
            placeholder="At least 6 characters"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            placeholder="Re-enter new password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
          />
          <Button type="submit" disabled={saving}>Update Password</Button>
        </form>
      </Card>
    </div>
  );
};

export default SettingsPage;
