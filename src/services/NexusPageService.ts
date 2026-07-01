import { NexusPage } from "@/models/NexusPageSchema";

export class NexusPageService {
  private static instance: NexusPageService;

  static getInstance() {
    if (!NexusPageService.instance) {
      NexusPageService.instance = new NexusPageService();
    }
    return NexusPageService.instance;
  }

  /** Called by HTTP autosave — persists the TipTap block tree + HTML. */
  async upsertContent(props: {
    workspaceKey: string;
    projectId: string;
    userId: string;
    title?: string;
    tiptapJson?: object | null;
    html?: string;
  }) {
    const { workspaceKey, projectId, userId, title, tiptapJson, html } = props;

    const update: Record<string, any> = {
      $set: { lastEditedBy: userId, projectId },
      $inc: { editCount: 1 },
      $setOnInsert: { workspaceKey },
    };
    if (html !== undefined) update.$set.html = html;
    if (tiptapJson !== undefined) update.$set.tiptapJson = tiptapJson;
    if (title !== undefined) update.$set.title = title;

    return NexusPage.findOneAndUpdate({ workspaceKey }, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });
  }

  /** Called by HTTP content fetch — returns the stored page. */
  async getPage(workspaceKey: string) {
    return NexusPage.findOne({ workspaceKey })
      .select("title tiptapJson html workspaceKey editCount updatedAt yjsState")
      .lean();
  }

  /** List pages for a project (for future multi-page support). */
  async listByProject(projectId: string) {
    return NexusPage.find({ projectId })
      .select("workspaceKey title editCount updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
  }
}
