import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postRequest } from '../../services/apiClient';

export const fetchCoursesThunk = createAsyncThunk(
  'courses/fetch',
  async (payload = {}, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/courses/list', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createCourseThunk = createAsyncThunk(
  'courses/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/courses/create', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateCourseThunk = createAsyncThunk(
  'courses/update',
  async (payload, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/courses/update', payload);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteCourseThunk = createAsyncThunk(
  'courses/delete',
  async (courseId, { rejectWithValue }) => {
    try {
      return await postRequest('/admin/courses/delete', { courseId });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const coursesSlice = createSlice({
  name: 'courses',
  initialState: { list: [], total: 0, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoursesThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCoursesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data.courses || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(fetchCoursesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default coursesSlice.reducer;
