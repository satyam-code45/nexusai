
import { getUserDocuments, UserDocument, UserDocumentList } from '@/lib/api/projects';
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'

export const fetchDocuments = createAsyncThunk(
    "project/fetchDocuments",
    async ({ projectId, userId, roomId }: { projectId: string, userId: string, roomId?: string }) =>
        getUserDocuments({ userId, projectId, roomId })
);


interface DocumentState {
    loading: boolean;
    error: string | null;
    userDocuments: UserDocument[],
    selectedDocument: UserDocument,
    navStack: UserDocument[],   // breadcrumb path, current page is last item
    cursor: { x: number, y: number },
    autocomplete: boolean;
    editorContent: string,
}

const initialState: DocumentState = {
    userDocuments: [],
    error: null,
    loading: false,
    selectedDocument: {
        _id: "",
        title: "",
        content: "",
        description: "",
        createdAt: ""
    },
    navStack: [],
    cursor: { x: 0, y: 0 },
    autocomplete: false,
    editorContent: "",
};


const aiEditorSlice = createSlice({
    name: 'aiEditorSlice',
    initialState: {
        ...initialState,

    },
    reducers: {

        toggleAutocomplete: state => {
            state.autocomplete = !state.autocomplete
        },

        updateEditorContentInRealTime(state, action: PayloadAction<string>) {
            state.editorContent = action.payload
        },

        trackCursorPosition(state, action: PayloadAction<{ x: number, y: number }>) {
            state.cursor = action.payload
        },

        // Root navigation (sidebar click / URL sync) — resets breadcrumb
        updateDocumentContent(state, action: PayloadAction<UserDocument>) {
            state.selectedDocument = { ...action.payload }
            state.navStack = [action.payload]
        },

        // Navigate INTO a sub-page — push onto breadcrumb stack
        pushNavPage(state, action: PayloadAction<UserDocument>) {
            const doc = action.payload
            const existingIdx = state.navStack.findIndex(d => d._id === doc._id)
            if (existingIdx >= 0) {
                state.navStack = state.navStack.slice(0, existingIdx + 1)
            } else {
                state.navStack = [...state.navStack, doc]
            }
            state.selectedDocument = doc
        },

        // Go BACK — trim stack to idx, land on that ancestor
        goBackTo(state, action: PayloadAction<number>) {
            const idx = action.payload
            state.navStack = state.navStack.slice(0, idx + 1)
            state.selectedDocument = state.navStack[idx]
        },

    },


    extraReducers: (builder) => {
        builder
            .addCase(fetchDocuments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDocuments.fulfilled, (state, action: PayloadAction<UserDocumentList>) => {
                state.userDocuments = action.payload?.documents;
                state.loading = false;
            })
            .addCase(fetchDocuments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch documents";
            });
    },


})

export const {
    updateDocumentContent,
    pushNavPage,
    goBackTo,
    updateEditorContentInRealTime,
    toggleAutocomplete,
    trackCursorPosition,
} = aiEditorSlice.actions



export default aiEditorSlice.reducer