import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import meetingsReducer from './slices/meetingsSlice';
import attendanceReducer from './slices/attendanceSlice';
import recordingsReducer from './slices/recordingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    meetings: meetingsReducer,
    attendance: attendanceReducer,
    recordings: recordingsReducer
  }
});

export default store;
