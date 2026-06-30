// store/chatSlice.ts
import { ChatHistoryReturnType, ChatMessage, fetchChatHistory, IFetchChatHistoryType } from "@/lib/api/chat";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";


type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  questions:string[]

};

type SnippingState={
  snippingFile:Blob | null
}

const initialState: ChatState & SnippingState = {
  messages: [],
  questions:[],
  loading: false,
  error: null,

  snippingFile:null
};

/**
 * Async thunk
 */
export const getChatHistory = createAsyncThunk<

   ChatHistoryReturnType,
  IFetchChatHistoryType,
  { rejectValue: string }
>("chat/getHistory", async ({userId,projectId,roomId}, { rejectWithValue }) => {
  try {
    const res = await fetchChatHistory({userId,projectId,roomId});
    return res;
  } catch (error) {
    return rejectWithValue("Failed to load chat history");
  }
});

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {


    setSnippingFile(state,  action: PayloadAction<Blob| null>){
state.snippingFile=action.payload
    },
    
    clearChat(state) {
      state.messages = [];
      state.questions = [];
    },


    addUserAndAiPlaceholder(
      state,
      action: PayloadAction<{ userId: string; content: string }>
    ) {
      state.messages.push(
        {
          role: "user",
          content: action.payload.content,
          userId: action.payload.userId,
          thinking: "",
          time: new Date().toISOString(),
        },
        {
          role: "ai",
          content: "",
          userId: action.payload.userId,
          thinking: "",
          time: new Date().toISOString(),
        }
      );
    },

    appendToLastAiMessage(state, action: PayloadAction<string>) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === "ai") {
        last.content += action.payload;

      }
    },


    appendToAssistantThinking(state, action: PayloadAction<string>) {
      const last = state.messages[state.messages.length - 1];
      if (last && last.role === "ai") {
        last.thinking = (last.thinking || "") + action.payload;
      }
    }


  },
  extraReducers: (builder) => {
    builder
      .addCase(getChatHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages
        state.questions = action.payload.questions

  

        
      })
      .addCase(getChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Unknown error";
      });
  },
});

export const { setSnippingFile,addUserAndAiPlaceholder,appendToAssistantThinking, appendToLastAiMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
