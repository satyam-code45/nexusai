import { Source } from "@/models/sourceSchema";
import { isRoomMemberForProject } from "@/lib/mongodb/roomAccess";

export class SourceService {
  private static instance: SourceService;

  public static getInstance(): SourceService {
    if (!SourceService.instance) {
      SourceService.instance = new SourceService();
    }
    return SourceService.instance;
  }

  async createSource(props: {
    source_type: string;
    userId: string;
    title: string;
    projectId: string;
    total_source: number;
    content: string;
    docId?: string;
  }) {
    const source = new Source({ ...props });
    const newSource = await source.save();
    return newSource.toObject();
  }

  // Upsert: update existing report for this doc+type, or create if none exists yet.
  async upsertSource(props: {
    source_type: string;
    userId: string;
    title: string;
    projectId: string;
    total_source: number;
    content: string;
    docId: string;
  }) {
    const { docId, source_type, userId, projectId, ...rest } = props;
    const result = await Source.findOneAndUpdate(
      { docId, source_type, userId, projectId },
      { ...rest, docId, source_type, userId, projectId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return result.toObject();
  }

  async getAllSources(props: { projectId: string; userId?: string }) {
    const filter: Record<string, any> = { projectId: props.projectId };
    if (props.userId) filter.userId = props.userId;
    return Source.find(filter);
  }

  async deleteSource(props: { id: string; projectId: string; userId: string }) {
    const source = await Source.findOne({ _id: props.id, projectId: props.projectId });
    if (!source) throw new Error("Report not found");

    if (source.userId?.toString() !== props.userId) {
      const allowed = await isRoomMemberForProject(props.userId, props.projectId);
      if (!allowed) throw new Error("Report not found or unauthorized");
    }

    await Source.deleteOne({ _id: props.id });
    return source;
  }
}
