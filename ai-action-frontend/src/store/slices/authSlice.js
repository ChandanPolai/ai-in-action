import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';
import {
  getUserToken,
  setUserToken,
  getUserData,
  setUserData,
  clearUserSession
} from '../../utils/storage';

export const loginUserThunk = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await postRequest('/user/auth/login', { email, password });
      if (response.status && response.data?.userToken) {
        setUserToken(response.data.userToken);
        setUserData(response.data.user);
      }
      return response;
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const fetchProfileThunk = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await postRequest('/user/auth/me');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    userToken: getUserToken(),
    user: getUserData(),
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      clearUserSession();
      state.userToken = null;
      state.user = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      setUserData(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUserThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.userToken = action.payload.data.userToken;
        state.user = action.payload.data.user;
      })
      .addCase(loginUserThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload.data.user;
        setUserData(action.payload.data.user);
      });
  }
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
