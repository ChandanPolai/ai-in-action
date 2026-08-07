import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import { setUser } from '../store/slices/authSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    name: user?.name || '',
    mobileNumber: user?.mobileNumber || '',
    secondaryMobileNumber: user?.secondaryMobileNumber || '',
    countryCode: user?.countryCode || '+91'
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user?.canUpdateProfile) {
      toast.error('Profile updates are disabled by admin');
      return;
    }
    setSaving(true);
    try {
      const res = await postRequest('/user/auth/update-profile', form);
      dispatch(setUser(res.data.user));
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
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await postRequest('/user/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
        <h2 className="text-2xl font-extrabold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      <Card title="Basic Information">
        {!user?.canUpdateProfile && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-4">
            Profile editing is disabled by admin. You can still change your password.
          </p>
        )}
        <form onSubmit={saveProfile} className="space-y-4">
          <Input
            label="Name"
            required
            disabled={!user?.canUpdateProfile}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Code"
              disabled={!user?.canUpdateProfile}
              value={form.countryCode}
              onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
            />
            <div className="col-span-2">
              <Input
                label="Mobile"
                disabled={!user?.canUpdateProfile}
                value={form.mobileNumber}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
              />
            </div>
          </div>
          <Input
            label="Secondary Mobile"
            disabled={!user?.canUpdateProfile}
            placeholder="Optional"
            value={form.secondaryMobileNumber}
            onChange={(e) => setForm({ ...form, secondaryMobileNumber: e.target.value })}
          />
          {user?.canUpdateProfile && (
            <Button type="submit" disabled={saving}>Save Profile</Button>
          )}
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
          <Input
            label="Confirm New Password"
            type="password"
            required
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
          />
          <Button type="submit" disabled={saving}>Update Password</Button>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
