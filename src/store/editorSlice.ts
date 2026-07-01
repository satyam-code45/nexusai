// store/chatSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";


type EditorState = {
    showTableofContent: boolean
  

};


const initialState: EditorState = {
    showTableofContent: false,


};


const editorSlice = createSlice({
    name: "editorSlice",
    initialState,
    reducers: {

       
        toggleTofC: state => {
            state.showTableofContent = !state.showTableofContent
        },

    },

});

export const { toggleTofC 
    // ,toggleSecondRightPanel,toggleRightPanel

} = editorSlice.actions;
export default editorSlice.reducer;
