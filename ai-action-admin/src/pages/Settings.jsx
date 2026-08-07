import React, { useState } from 'react';
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
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await postRequest('/admin/auth/change-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
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
        <p className="text-sm text-slate-500">Manage your admin profile</p>
      </div>

      <Card title="Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <Input label="Name" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <Input label="Email" type="email" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          <Button type="submit" disabled={saving}>Save Profile</Button>
        </form>
      </Card>

      <Card title="Change Password">
        <form onSubmit={changePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          />
          <Input
            label="New Password"
            type="password"
            required
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          />
          <Button type="submit" disabled={saving}>Update Password</Button>
        </form>
      </Card>
    </div>
  );
};

export default SettingsPage;
