import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import { setUser } from '../store/slices/authSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  COUNTRY_CODES,
  digitsOnly,
  normalizeCountryCode,
  validateMobileNumber,
  validateOptionalMobile
} from '../utils/countryCodes';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    name: '',
    mobileNumber: '',
    secondaryMobileNumber: '',
    countryCode: '+91'
  });
  const [errors, setErrors] = useState({ mobileNumber: '', secondaryMobileNumber: '' });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      mobileNumber: digitsOnly(user.mobileNumber || ''),
      secondaryMobileNumber: digitsOnly(user.secondaryMobileNumber || ''),
      countryCode: normalizeCountryCode(user.countryCode || '+91')
    });
  }, [user]);

  const onMobileChange = (field, value) => {
    const digits = digitsOnly(value);
    const maxLen = form.countryCode === '+91' ? 10 : 15;
    const next = digits.slice(0, maxLen);
    setForm((prev) => ({ ...prev, [field]: next }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user?.canUpdateProfile) {
      toast.error('Profile updates are disabled by admin');
      return;
    }

    const mobileErr = validateMobileNumber(form.mobileNumber, form.countryCode);
    const secondaryErr = validateOptionalMobile(form.secondaryMobileNumber, form.countryCode);
    setErrors({ mobileNumber: mobileErr, secondaryMobileNumber: secondaryErr });
    if (mobileErr || secondaryErr) {
      toast.error(mobileErr || secondaryErr);
      return;
    }
    if (!String(form.name || '').trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await postRequest('/user/auth/update-profile', {
        name: form.name.trim(),
        countryCode: normalizeCountryCode(form.countryCode),
        mobileNumber: digitsOnly(form.mobileNumber),
        secondaryMobileNumber: digitsOnly(form.secondaryMobileNumber)
      });
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

  const canEdit = Boolean(user?.canUpdateProfile);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      <Card title="Basic Information">
        {!canEdit && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-4">
            Profile editing is disabled by admin. You can still change your password.
          </p>
        )}
        <form onSubmit={saveProfile} className="space-y-4">
          <Input
            label="Name"
            required
            disabled={!canEdit}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="w-full space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Country code <span className="text-rose-500">*</span>
              </label>
              <select
                className="custom-input"
                disabled={!canEdit}
                value={form.countryCode}
                onChange={(e) => {
                  const countryCode = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    countryCode,
                    mobileNumber:
                      countryCode === '+91'
                        ? digitsOnly(prev.mobileNumber).slice(0, 10)
                        : prev.mobileNumber,
                    secondaryMobileNumber:
                      countryCode === '+91'
                        ? digitsOnly(prev.secondaryMobileNumber).slice(0, 10)
                        : prev.secondaryMobileNumber
                  }));
                  setErrors({ mobileNumber: '', secondaryMobileNumber: '' });
                }}
              >
                {!COUNTRY_CODES.some((c) => c.dial === form.countryCode) && form.countryCode ? (
                  <option value={form.countryCode}>{form.countryCode}</option>
                ) : null}
                {COUNTRY_CODES.map((c) => (
                  <option key={c.dial + c.label} value={c.dial}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Mobile number"
                required
                disabled={!canEdit}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={form.countryCode === '+91' ? '10-digit mobile' : 'Mobile number'}
                maxLength={form.countryCode === '+91' ? 10 : 15}
                value={form.mobileNumber}
                error={errors.mobileNumber}
                onChange={(e) => onMobileChange('mobileNumber', e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Full number: {form.countryCode}
                {form.mobileNumber || 'XXXXXXXXXX'}
              </p>
            </div>
          </div>

          <Input
            label="Secondary mobile"
            disabled={!canEdit}
            inputMode="numeric"
            placeholder="Optional"
            maxLength={form.countryCode === '+91' ? 10 : 15}
            value={form.secondaryMobileNumber}
            error={errors.secondaryMobileNumber}
            onChange={(e) => onMobileChange('secondaryMobileNumber', e.target.value)}
          />

          {canEdit && (
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
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
          <Button type="submit" disabled={saving}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
