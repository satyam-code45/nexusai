"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ActiveRoom {
  roomId: string;
  name: string;
  projectId: string;
  password?: string;
  role?: "owner" | "editor" | "viewer";
}

interface RoomState {
  createModal: boolean;
  joinModal: boolean;
  myRoomsModal: boolean;
  activeRoom: ActiveRoom | null;
}

const initialState: RoomState = {
  createModal: false,
  joinModal: false,
  myRoomsModal: false,
  activeRoom: null,
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    toggleCreateRoomModal(state) {
      state.createModal = !state.createModal;
    },
    toggleJoinRoomModal(state) {
      state.joinModal = !state.joinModal;
    },
    toggleMyRoomsModal(state) {
      state.myRoomsModal = !state.myRoomsModal;
    },
    setActiveRoom(state, action: PayloadAction<ActiveRoom>) {
      state.activeRoom = action.payload;
    },
    clearActiveRoom(state) {
      state.activeRoom = null;
    },
  },
});

export const { toggleCreateRoomModal, toggleJoinRoomModal, toggleMyRoomsModal, setActiveRoom, clearActiveRoom } =
  roomSlice.actions;

export default roomSlice.reducer;
