// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import chatSlice from "./chatSlice";
import uiSlice from "./uiSlice";
import projectSlice from "./projectSlice";
import docSlice from './docSlice'
import editorSlice from "./editorSlice";
import aiEditorSlice from "./aiEditorSlice";
import roomSlice from "./roomSlice";
export const store = configureStore({
  reducer: {
    chat: chatSlice,
    ui: uiSlice,
    project: projectSlice,
    doc: docSlice,
    editor: editorSlice,
    aiEditor: aiEditorSlice,
    room: roomSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
