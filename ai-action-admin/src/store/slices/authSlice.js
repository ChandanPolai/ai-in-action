import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';
import {
  getAdminToken,
  setAdminToken,
  getAdminData,
  setAdminData,
  clearAdminSession
} from '../../utils/storage';

export const loginAdminThunk = createAsyncThunk(
  'auth/loginAdmin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await postRequest('/admin/auth/login', { email, password });
      if (response.status && response.data?.adminToken) {
        setAdminToken(response.data.adminToken);
        setAdminData(response.data.admin);
      }
      return response;
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const fetchAdminProfileThunk = createAsyncThunk(
  'auth/fetchAdminProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/auth/me');
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    adminToken: getAdminToken(),
    admin: getAdminData(),
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      clearAdminSession();
      state.adminToken = null;
      state.admin = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdminThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdminThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.adminToken = action.payload.data.adminToken;
        state.admin = action.payload.data.admin;
      })
      .addCase(loginAdminThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAdminProfileThunk.fulfilled, (state, action) => {
        state.admin = action.payload.data;
        setAdminData(action.payload.data);
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
