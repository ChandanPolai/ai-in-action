import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';

export const fetchWorkshopsThunk = createAsyncThunk(
  'workshops/fetch',
  async (payload = {}, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/workshops/list', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createWorkshopThunk = createAsyncThunk(
  'workshops/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/workshops/create', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateWorkshopThunk = createAsyncThunk(
  'workshops/update',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/workshops/update', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteWorkshopThunk = createAsyncThunk(
  'workshops/delete',
  async (workshopId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/workshops/delete', { workshopId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setWorkshopAccessThunk = createAsyncThunk(
  'workshops/setAccess',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/workshops/set-access', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchWorkshopAccessMatrixThunk = createAsyncThunk(
  'workshops/accessMatrix',
  async (workshopId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/workshops/access-matrix', { workshopId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const workshopsSlice = createSlice({
  name: 'workshops',
  initialState: { list: [], total: 0, loading: false, error: null, accessMatrix: [] },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkshopsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWorkshopsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data.workshops || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(fetchWorkshopsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchWorkshopAccessMatrixThunk.fulfilled, (state, action) => {
        state.accessMatrix = action.payload.data.matrix || [];
      });
  }
});

export default workshopsSlice.reducer;
