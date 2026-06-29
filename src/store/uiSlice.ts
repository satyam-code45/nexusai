// ui slice
// store/uiSlice.ts
import { createSlice } from "@reduxjs/toolkit";

interface UIState {
  isChatOpen: boolean;
}

const initialState: UIState = {
  isChatOpen: true, // open by default
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleChat: (state) => {
      state.isChatOpen = !state.isChatOpen;
    },
    openChat: (state) => {
      state.isChatOpen = true;
    },
    closeChat: (state) => {
      state.isChatOpen = false;
    },
  },
});

export const { toggleChat, openChat, closeChat } = uiSlice.actions;
export default uiSlice.reducer;
