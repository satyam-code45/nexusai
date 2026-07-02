export type RoomInfo = { roomId: string; name: string; projectId: string; password?: string };

export type RoomSummary = RoomInfo & {
  ownerId: string;
  memberCount: number;
  createdAt: string;
  password?: string;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

export async function createRoom(data: {
  name: string;
  password: string;
  projectId: string;
}): Promise<RoomInfo> {
  const { room } = await request<{ room: RoomInfo }>("POST", "/api/rooms", data);
  return room;
}

export async function joinRoom(data: {
  roomId: string;
  password: string;
}): Promise<RoomInfo> {
  const { room } = await request<{ room: RoomInfo }>("POST", "/api/rooms/join", data);
  return room;
}

export async function getRooms(): Promise<RoomSummary[]> {
  const { rooms } = await request<{ rooms: RoomSummary[] }>("GET", "/api/rooms");
  return rooms;
}

export async function getRoomForProject(
  projectId: string
): Promise<(RoomInfo & { password?: string }) | null> {
  const { room } = await request<{ room: (RoomInfo & { password?: string }) | null }>(
    "GET",
    `/api/rooms?projectId=${projectId}`
  );
  return room;
}

export async function getRoomById(roomId: string): Promise<RoomInfo & { memberCount: number }> {
  const { room } = await request<{ room: RoomInfo & { memberCount: number } }>(
    "GET",
    `/api/rooms/${roomId}`
  );
  return room;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await request("DELETE", `/api/rooms/${roomId}`);
}

export async function saveRoomPassword(roomId: string, password: string): Promise<void> {
  await request("PATCH", `/api/rooms/${roomId}`, { password });
}
