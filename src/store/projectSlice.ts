import { getProjects, PaginationType, ProjectServerData } from '@/lib/api/projects';
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'

export const fetchProjects = createAsyncThunk(
  "project/fetchProjects",
  async ({ page = 1, search = "" ,userId}: { page: number, search: string ,userId:string}) => getProjects(page, search,userId)
);

interface ProjectState extends ProjectServerData {

  loading: boolean;
  error: string | null;
   modal: boolean;
   searchProjectModal:boolean
   addSourceModal:boolean
  currentProject?: { id?: string; name?: string; edit?: boolean } | null;
}

const initialState: ProjectState = {
  projects:{projects: [],pagination:{} as PaginationType},
  loading: false,
  searchProjectModal:false,
  addSourceModal:false,
  error: null,
    modal:false
};


const projectSlice = createSlice({
  name: 'projectSlice',
  initialState: {
 ...initialState,
 
  },
  reducers: {
   
    toggleModal: state => {

      state.modal = !state.modal
      state.currentProject={ edit: false };
    },
     toggleSearchProjectModal: state => {

      state.searchProjectModal = !state.searchProjectModal
    },
      toggleAddSourceModal: state => {
      state.addSourceModal = !state.addSourceModal
    },


     setCurrentProject: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.currentProject = { ...action.payload, edit: true };
      state.modal = true;
    },

    removeProject: (state, action: PayloadAction<string>) => {
      state.projects.projects = state.projects.projects.filter(
        (p) => p._id !== action.payload
      );
    },

  },


   extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action: PayloadAction<ProjectServerData>) => {
        state.projects = action.payload?.projects ?? { projects: [], pagination: {} as PaginationType };
        state.loading = false;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch projects";
      });
  },


})

export const { toggleModal, toggleAddSourceModal, toggleSearchProjectModal, setCurrentProject, removeProject } = projectSlice.actions



export default projectSlice.reducer