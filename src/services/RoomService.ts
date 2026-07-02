import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { Types } from "mongoose";
import { Room } from "@/models/RoomSchema";
import { connectDB } from "@/lib/mongodb/mongodb";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const supplied = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, supplied);
}

function generateRoomId(): string {
  return randomBytes(6).toString("hex");
}

export type RoomSummary = {
  roomId: string;
  name: string;
  projectId: string;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
  password?: string;
};

export type RoomMember = {
  userId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: Date;
};

export class RoomService {
  private static instance: RoomService;
  static getInstance() {
    if (!RoomService.instance) RoomService.instance = new RoomService();
    return RoomService.instance;
  }

  async createRoom(data: {
    name: string;
    password: string;
    projectId: string;
    ownerId: string;
  }): Promise<{ roomId: string; name: string; projectId: string; password: string }> {
    await connectDB();
    const roomId = generateRoomId();
    const passwordHash = hashPassword(data.password);

    const room = await Room.create({
      roomId,
      name: data.name.trim(),
      projectId: data.projectId,
      ownerId: data.ownerId,
      passwordHash,
      password: data.password,
      members: [{ userId: data.ownerId, role: "owner" }],
    });

    return {
      roomId: room.roomId,
      name: room.name,
      projectId: room.projectId.toString(),
      password: room.password,
    };
  }

  async joinRoom(data: {
    roomId: string;
    password: string;
    userId: string;
  }): Promise<{ roomId: string; name: string; projectId: string }> {
    await connectDB();
    const room = await Room.findOne({ roomId: data.roomId });
    if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });

    if (!verifyPassword(data.password, room.passwordHash)) {
      throw Object.assign(new Error("Incorrect password"), { status: 401 });
    }

    // Atomic add: only push if this userId isn't already in the members array.
    // Using $ne filter instead of $addToSet avoids duplicates caused by
    // differing joinedAt timestamps making otherwise-identical objects unequal.
    await Room.findOneAndUpdate(
      { roomId: data.roomId, "members.userId": { $ne: new Types.ObjectId(data.userId) } },
      { $push: { members: { userId: data.userId, role: "editor", joinedAt: new Date() } } },
      { new: true }
    );

    const updated = await Room.findOne({ roomId: data.roomId });
    return {
      roomId: updated!.roomId,
      name: updated!.name,
      projectId: updated!.projectId.toString(),
    };
  }

  async getRoom(
    roomId: string,
    requestingUserId: string
  ): Promise<{ roomId: string; name: string; projectId: string; memberCount: number; role: string; password?: string }> {
    await connectDB();
    const room = await Room.findOne({ roomId }).lean();
    if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });

    const member = (room as any).members?.find((m: any) => m.userId?.toString() === requestingUserId);
    const isOwner = (room as any).ownerId?.toString() === requestingUserId;

    if (!member && !isOwner) {
      throw Object.assign(new Error("Access denied"), { status: 403 });
    }

    const role = isOwner ? "owner" : (member?.role ?? "editor");

    return {
      roomId: (room as any).roomId,
      name: (room as any).name,
      projectId: (room as any).projectId?.toString(),
      memberCount: (room as any).members?.length ?? 0,
      role,
      ...(isOwner && (room as any).password ? { password: (room as any).password } : {}),
    };
  }

  async getMemberRole(roomId: string, userId: string): Promise<"owner" | "editor" | "viewer" | null> {
    await connectDB();
    const room = await Room.findOne({ roomId }, { ownerId: 1, members: 1 }).lean();
    if (!room) return null;

    if ((room as any).ownerId?.toString() === userId) return "owner";
    const member = (room as any).members?.find((m: any) => m.userId?.toString() === userId);
    return member?.role ?? null;
  }

  async updateMemberRole(data: {
    roomId: string;
    targetUserId: string;
    newRole: "editor" | "viewer";
    requestingUserId: string;
  }): Promise<void> {
    await connectDB();
    const room = await Room.findOne({ roomId: data.roomId });
    if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });

    if (room.ownerId.toString() !== data.requestingUserId) {
      throw Object.assign(new Error("Only the room owner can change member roles"), { status: 403 });
    }

    if (room.ownerId.toString() === data.targetUserId) {
      throw Object.assign(new Error("Cannot change the owner's role"), { status: 400 });
    }

    const memberIdx = room.members.findIndex(
      (m: any) => m.userId.toString() === data.targetUserId
    );
    if (memberIdx === -1) throw Object.assign(new Error("Member not found"), { status: 404 });

    room.members[memberIdx].role = data.newRole;
    await room.save();
  }

  async getRoomForProject(
    userId: string,
    projectId: string
  ): Promise<{ roomId: string; name: string; projectId: string; password?: string } | null> {
    await connectDB();
    const room = await Room.findOne({
      projectId,
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    })
      .select("roomId name projectId ownerId password")
      .lean();

    if (!room) return null;

    const isOwner = (room as any).ownerId?.toString() === userId;
    return {
      roomId: (room as any).roomId,
      name: (room as any).name,
      projectId: (room as any).projectId?.toString(),
      ...(isOwner && (room as any).password ? { password: (room as any).password } : {}),
    };
  }

  async getUserRooms(userId: string): Promise<RoomSummary[]> {
    await connectDB();
    const rooms = await Room.find({
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    })
      .select("roomId name projectId ownerId members createdAt password")
      .lean();

    return rooms.map((r: any) => ({
      roomId: r.roomId,
      name: r.name,
      projectId: r.projectId?.toString(),
      ownerId: r.ownerId?.toString(),
      memberCount: r.members?.length ?? 0,
      createdAt: r.createdAt,
      ...(r.ownerId?.toString() === userId && r.password ? { password: r.password } : {}),
    }));
  }

  async savePassword(roomId: string, password: string, requestingUserId: string): Promise<void> {
    await connectDB();
    const room = await Room.findOne({ roomId });
    if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });
    if (room.ownerId.toString() !== requestingUserId)
      throw Object.assign(new Error("Only the owner can save the password"), { status: 403 });
    room.password = password;
    await room.save();
  }

  async deleteRoom(roomId: string, requestingUserId: string): Promise<void> {
    await connectDB();
    const room = await Room.findOne({ roomId });
    if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });
    if (room.ownerId.toString() !== requestingUserId)
      throw Object.assign(new Error("Only the owner can delete a room"), { status: 403 });
    await Room.deleteOne({ roomId });
  }
}
