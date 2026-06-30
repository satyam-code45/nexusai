import { DocsServerData, getDocuments, getProjects, getSources, PaginationType, ProjectServerData, reportDataType, ReportsServerData } from '@/lib/api/projects';
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'

export const fetchDocs = createAsyncThunk(
    "project/docs",
    async ({ projectId, userId, roomId }: { projectId: string, userId: string, roomId?: string }) =>
        getDocuments({ projectId, userId, roomId })
);

export const fetchSources = createAsyncThunk(
    "fetch/sources",
    async ({ projectId, userId, roomId }: { projectId: string, userId: string, roomId?: string }) =>
        getSources({ projectId, userId, roomId })
);



interface docState {
    docs: Array<Record<string, any>>
    sources: Array<Record<string, any>>
    mindMapModal: MindMapType,
    viewReportModal: reportDataType
    loading: boolean;
    error: string | null;
    selectedProject: string | null
    docIds: string[]
    showViewReportModal: boolean
    documentModal: boolean

    viewPdf: string | null
    viewSourceType: string | null
}

type MindMapType = { modal: boolean } & reportDataType

const initialState: docState = {
    mindMapModal: {} as MindMapType,
    docIds: [] as string[],
    viewReportModal: {} as reportDataType,
    showViewReportModal: false,
    sources: [],
    docs: [],
    selectedProject: null,
    loading: false,
    error: null,
    documentModal:false,

    viewPdf: null,
    viewSourceType: null
};




const docSlice = createSlice({
    name: 'docSlice',
    initialState: {
        ...initialState,
    },
    reducers: {

        
    toggleDocumentModal: state => {
      state.documentModal = !state.documentModal
    },
        viewPdf(state, action: PayloadAction<string | null>) {
            state.viewPdf = action.payload;
        },
        setViewSourceType(state, action: PayloadAction<string | null>) {
            state.viewSourceType = action.payload;
        },

        attribMindMapModalData(state, action: PayloadAction<MindMapType>) {
            state.mindMapModal = action.payload
        },

        toggleMindMapModal(state) {
            state.mindMapModal.modal = !state.mindMapModal.modal
        },

        selectedReport(state, action: PayloadAction<reportDataType>) {
            state.viewReportModal = action.payload
            state.showViewReportModal = true
        },
        toggleViewReportModal(state) {
            state.showViewReportModal = !state.showViewReportModal
        },

        selectProject(state, action: PayloadAction<string>) {
            state.selectedProject = action.payload;
            state.docIds = [];
        },

        addDocIds: (state, action: PayloadAction<string>) => {
            const exist = state.docIds.includes(action.payload)
            if (exist) {
                const newArray = state.docIds.filter((pushId: string) => pushId !== action.payload)
                state.docIds = newArray

            } else {
                state.docIds.push(action.payload)
            }

        }

    },


    extraReducers: (builder) => {
        builder
            .addCase(fetchDocs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDocs.fulfilled, (state, action: PayloadAction<DocsServerData>) => {
                state.docs = action.payload?.docs;
                state.loading = false;
            })
            .addCase(fetchDocs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch docs";
            });



        builder
            .addCase(fetchSources.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSources.fulfilled, (state, action: PayloadAction<ReportsServerData>) => {
                state.sources = action.payload?.sources;
                state.loading = false;
            })
            .addCase(fetchSources.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch docs";
            });
    },





})

export const { toggleDocumentModal, selectProject, viewPdf, setViewSourceType, attribMindMapModalData, toggleMindMapModal, addDocIds, selectedReport, toggleViewReportModal } = docSlice.actions



export default docSlice.reducer