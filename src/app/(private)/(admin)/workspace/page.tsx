"use client";

import LefPanel from "@/components/leftpanel/LeftPanel";
import { useSession } from "next-auth/react";
import { SearchProjectModal } from "@/components/project/SearchProjectModal";
import { FolderOpen } from "lucide-react";

export default function Page() {
  const { data: session } = useSession();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <LefPanel userId={session?.user?.id} projectId={undefined} />

      <main className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--l-tint)] flex items-center justify-center">
            <FolderOpen size={22} className="text-[var(--l-moss)]" />
          </div>
          <p className="text-sm font-medium text-foreground">No project open</p>
          <p className="text-xs text-muted-foreground">Select a project from the sidebar to get started</p>
        </div>
      </main>

      <SearchProjectModal />
    </div>
  );
}
