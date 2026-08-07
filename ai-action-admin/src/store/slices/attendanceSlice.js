import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';

export const fetchAttendanceThunk = createAsyncThunk(
  'attendance/fetch',
  async (payload = {}, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/attendance/list', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateAttendanceThunk = createAsyncThunk(
  'attendance/update',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/attendance/update', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: { records: [], total: 0, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAttendanceThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.data.records || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(fetchAttendanceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default attendanceSlice.reducer;
