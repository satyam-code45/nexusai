import { Room } from "@/models/RoomSchema";
import { connectDB } from "./mongodb";

/**
 * Returns the correct MongoDB filter for project-scoped queries.
 * - Without roomId (personal scope): filter by { userId, projectId }
 * - With a valid roomId where user is a member: filter by { projectId } only
 *   so all members see each other's documents/sources.
 */
export async function getProjectFilter(
  userId: string,
  projectId: string,
  roomId?: string | null
): Promise<{ userId?: string; projectId: string }> {
  if (!roomId) return { userId, projectId };

  await connectDB();
  const isMember = await Room.exists({
    roomId,
    projectId,
    $or: [{ ownerId: userId }, { "members.userId": userId }],
  });

  return isMember ? { projectId } : { userId, projectId };
}

/**
 * Returns true if the user is a member or owner of any room tied to projectId.
 * Used to authorize writes from non-owning collaborators.
 */
export async function isRoomMemberForProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  await connectDB();
  return !!(await Room.exists({
    projectId,
    $or: [{ ownerId: userId }, { "members.userId": userId }],
  }));
}
