
'use client'

import { Input } from "../ui/input";
import { BaseModal } from "../general/BaseModal";
import { z } from 'zod'
import { Loader2, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useState } from "react";
import { AppDispatch, RootState } from "@/store";
import { fetchProjects, toggleModal, toggleSearchProjectModal } from "@/store/projectSlice";
import { debounce } from 'lodash';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export const SearchProjectModal = ({ session }: any) => {

    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const { modal, currentProject, searchProjectModal, projects, loading } = useSelector((state: RootState) => state.project);
    const [showEmoji, setShowEmoji] = useState(false);

    const { data: clientSession } = useSession();
    const activeSession = session || clientSession;

    const { pagination } = projects;
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const totalPages = pagination?.totalPages ?? 1;
    const userId = activeSession?.user?.id;

    const fetchProjectWithDebounce = useCallback(
        debounce((page: number, search: string) => {
            if (userId) {
                dispatch(fetchProjects({ page, search, userId }));
            }
        }, 500),
        [dispatch, userId]
    );

    const searchProjects = (e: React.ChangeEvent<HTMLInputElement>) => {

        const title = e.target.value

        setSearch(title)
        setPage(1)

    }


    useEffect(() => {
        if (userId) {
            fetchProjectWithDebounce(page, search)
        }
    }, [page, search, userId, fetchProjectWithDebounce])

    return (
        <div>

            <BaseModal
                open={searchProjectModal}
                onOpenChange={() => dispatch(toggleSearchProjectModal())}
                title="Search Projects"
                description=""
                width={500}
                height={450}
                footer={
                    <>

                    </>
                }
            >
                <form  >
                    <div className="px-4 py-3 sticky top-0 z-10 ">
                        <div className="relative h-10">
                            {/* Left icon */}
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                            {/* Input */}
                            <Input
                                onChange={searchProjects}
                                value={search}
                                placeholder="Search project..."
                                className="pl-9 pr-9 h-10 ring-0 bg-transparent"
                            />

                            {/* Right loader (space always reserved) */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
                                {loading && (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-2 h-[250px] overflow-y-scroll flex ">
                        {projects?.projects?.length > 0 ? (
                            <ul className="space-y-1 w-full">
                                {projects.projects.map((project) => (
                                    <li key={project._id} onClick={() => { router.push(`/workspace/${project._id}`); dispatch(toggleSearchProjectModal()); }} className="flex items-center gap-3 px-3 py-1 rounded-md hover:bg-muted cursor-pointer">
                                        <span className="text-lg">{project?.emoji ?? "📁"}</span>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-foreground">{project.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                Created {new Date(project?.createdAt ?? "").toLocaleDateString()}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No projects found</p>
                        )}
                    </div>



                </form>

            </BaseModal>
        </div>

    );
}

