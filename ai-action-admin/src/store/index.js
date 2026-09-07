import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import meetingsReducer from './slices/meetingsSlice';
import attendanceReducer from './slices/attendanceSlice';
import recordingsReducer from './slices/recordingsSlice';
import coursesReducer from './slices/coursesSlice';
import workshopsReducer from './slices/workshopsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    meetings: meetingsReducer,
    attendance: attendanceReducer,
    recordings: recordingsReducer,
    courses: coursesReducer,
    workshops: workshopsReducer
  }
});

export default store;
