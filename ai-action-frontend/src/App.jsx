import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import MeetingsPage from './pages/Meetings';
import AttendancePage from './pages/Attendance';
import RecordingsPage from './pages/Recordings';
import ProfilePage from './pages/Profile';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { logout, fetchProfileThunk } from './store/slices/authSlice';
import { setStoredActiveTab } from './utils/storage';

const DashboardWrapper = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { userToken } = useSelector((state) => state.auth);

  const pathSegment = location.pathname.replace(/^\//, '').split('/')[0];
  const activeTab = pathSegment && pathSegment !== 'dashboard' ? pathSegment : 'dashboard';

  useEffect(() => {
    if (userToken) dispatch(fetchProfileThunk());
  }, [dispatch, userToken]);

  useEffect(() => {
    setStoredActiveTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setStoredActiveTab(tabId);
    navigate(tabId === 'dashboard' ? '/dashboard' : `/${tabId}`);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'meetings':
        return <MeetingsPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'recordings':
        return <RecordingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange} onLogout={() => dispatch(logout())}>
      {renderActiveView()}
    </Layout>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
