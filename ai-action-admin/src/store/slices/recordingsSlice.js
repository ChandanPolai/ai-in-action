import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';

export const fetchRecordingsThunk = createAsyncThunk(
  'recordings/fetch',
  async (payload = {}, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/recordings/list', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createRecordingThunk = createAsyncThunk(
  'recordings/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/recordings/create', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateRecordingThunk = createAsyncThunk(
  'recordings/update',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/recordings/update', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteRecordingThunk = createAsyncThunk(
  'recordings/delete',
  async (recordingId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/recordings/delete', { recordingId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setAccessThunk = createAsyncThunk(
  'recordings/setAccess',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/recordings/set-access', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAccessMatrixThunk = createAsyncThunk(
  'recordings/accessMatrix',
  async (recordingId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/recordings/access-matrix', { recordingId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const recordingsSlice = createSlice({
  name: 'recordings',
  initialState: { list: [], total: 0, loading: false, error: null, accessMatrix: [] },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecordingsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRecordingsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data.recordings || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(fetchRecordingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAccessMatrixThunk.fulfilled, (state, action) => {
        state.accessMatrix = action.payload.data.matrix || [];
      });
  }
});

export default recordingsSlice.reducer;
