import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';

export const fetchUsersThunk = createAsyncThunk(
  'users/fetchUsers',
  async (payload = {}, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/users/list', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createUserThunk = createAsyncThunk(
  'users/createUser',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/users/create', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateUserThunk = createAsyncThunk(
  'users/updateUser',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/users/update', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteUserThunk = createAsyncThunk(
  'users/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/users/delete', { userId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const toggleUserStatusThunk = createAsyncThunk(
  'users/toggleStatus',
  async (userId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/users/toggle-status', { userId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resetPasswordThunk = createAsyncThunk(
  'users/resetPassword',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/users/reset-password', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    total: 0,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data.users || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default usersSlice.reducer;
