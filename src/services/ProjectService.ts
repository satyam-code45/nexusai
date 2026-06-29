import { Project } from "@/models/ProjectSchema";
import { Types } from "mongoose";

export type ProjectTypeProps = { name: string, userId: string, emoji: string }

export class ProjectService {
  private static instance: ProjectService;


  // singleton design pattern
  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }


  async createProject(props: ProjectTypeProps) {

    const project = new Project({
      ...props
    })
    const newProject = await project.save()
    return newProject.toObject()

  }


  async updateProjects(props: { id: string, name: string, userId: string }) {

    const updateNote = await Project.findOneAndUpdate(
      { _id: props.id, userId: props.userId },
      { name: props.name },
      { new: true, runValidators: true }
    );
    return updateNote
  }


  async getSingleProject(projectId: string, userId: string) {
    const project = await Project.findOne({ _id: projectId, userId })
    return project
  }

  async deleteProject({ id, userId }: { id: string; userId: string }) {
    await Project.findOneAndDelete({ _id: id, userId });
  }






  async getAllProjects({

    search = "",
    page = 1,
    limit = 10,
    userId
  }: {
    search?: string;
    page?: number;
    limit?: number;
    userId: string
  }) {
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
    userId: new Types.ObjectId(userId),
  };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }) // newest first
        .lean(),
      Project.countDocuments(filter),
    ]);

    return {
      projects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


}