import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';

export const fetchBonusesThunk = createAsyncThunk(
  'bonuses/fetch',
  async (payload = {}, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/bonuses/list', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createBonusThunk = createAsyncThunk(
  'bonuses/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/bonuses/create', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateBonusThunk = createAsyncThunk(
  'bonuses/update',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/bonuses/update', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteBonusThunk = createAsyncThunk(
  'bonuses/delete',
  async (bonusId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/bonuses/delete', { bonusId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setBonusAccessThunk = createAsyncThunk(
  'bonuses/setAccess',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/bonuses/set-access', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBonusAccessMatrixThunk = createAsyncThunk(
  'bonuses/accessMatrix',
  async (bonusId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/bonuses/access-matrix', { bonusId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const bonusesSlice = createSlice({
  name: 'bonuses',
  initialState: { list: [], total: 0, loading: false, error: null, accessMatrix: [] },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBonusesThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBonusesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data.bonuses || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(fetchBonusesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBonusAccessMatrixThunk.fulfilled, (state, action) => {
        state.accessMatrix = action.payload.data.matrix || [];
      });
  }
});

export default bonusesSlice.reducer;
