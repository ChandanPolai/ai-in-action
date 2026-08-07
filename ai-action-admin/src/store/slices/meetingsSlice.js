import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';

export const fetchMeetingsThunk = createAsyncThunk(
  'meetings/fetch',
  async (payload = {}, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/meetings/list', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createMeetingThunk = createAsyncThunk(
  'meetings/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/meetings/create', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateMeetingThunk = createAsyncThunk(
  'meetings/update',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/meetings/update', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteMeetingThunk = createAsyncThunk(
  'meetings/delete',
  async (meetingId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/meetings/delete', { meetingId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState: { list: [], total: 0, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeetingsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMeetingsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data.meetings || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(fetchMeetingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default meetingsSlice.reducer;
