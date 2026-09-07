import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import MeetingsPage from './pages/Meetings';
import AttendancePage from './pages/Attendance';
import RecordingsPage from './pages/Recordings';
import PlayRequestsPage from './pages/PlayRequests';
import CoursesPage from './pages/Courses';
import ComplaintsPage from './pages/Complaints';
import ReviewsPage from './pages/Reviews';
import SettingsPage from './pages/Settings';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { logout, fetchAdminProfileThunk } from './store/slices/authSlice';
import { setStoredActiveTab } from './utils/storage';

const DashboardWrapper = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { adminToken } = useSelector((state) => state.auth);

  const pathSegment = location.pathname.replace(/^\//, '').split('/')[0];
  const activeTab = pathSegment && pathSegment !== 'dashboard' ? pathSegment : 'dashboard';

  useEffect(() => {
    if (adminToken) dispatch(fetchAdminProfileThunk());
  }, [dispatch, adminToken]);

  useEffect(() => {
    setStoredActiveTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setStoredActiveTab(tabId);
    navigate(tabId === 'dashboard' ? '/dashboard' : `/${tabId}`);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'users':
        return <UsersPage />;
      case 'meetings':
        return <MeetingsPage />;
      case 'reviews':
        return <ReviewsPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'recordings':
        return <RecordingsPage />;
      case 'play-requests':
        return <PlayRequestsPage />;
      case 'courses':
        return <CoursesPage />;
      case 'feedback':
        return <ComplaintsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onLogout={() => dispatch(logout())}
      onOpenSettings={() => handleTabChange('settings')}
    >
      {renderActiveView()}
    </Layout>
  );
};

const App = () => {
  const rawBase = import.meta.env.BASE_URL || '/';
  const basename = rawBase === '/' ? undefined : rawBase.replace(/\/$/, '');

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<Login />} />
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
};

export default App;
