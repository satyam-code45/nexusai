"use client"

import { DocsServerData, reportDataType, ReportsServerData } from "@/lib/api/projects";
import Image from "next/image";
import { Checkbox } from "../ui/checkbox";
import { useMemo, useState } from "react";
import { AlignLeft, BrainCircuit, FileText, GraduationCap, HelpCircle, Briefcase, Headphones, Search } from "lucide-react";
import { Input } from "../ui/input";
import React from "react";
import { truncateTitle } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { attribMindMapModalData, selectedReport } from "@/store/docSlice";
import { AppDispatch, RootState } from "@/store";


type ReportListProps = ReportsServerData & { loading: boolean }
const ReportList = ({ sources, loading }: ReportListProps) => {

    const [query, setQuery] = useState("");

    const filteredSources = React.useMemo(() => {
        const source = sources
        if (!query.trim()) return source;
        const q = query.toLowerCase();
        return source.filter((item) => item.title.toLowerCase().includes(q));
    }, [query, sources]);

    const dispatch = useDispatch<AppDispatch>();

    const { viewReportModal, showViewReportModal } = useSelector((state: RootState) => state.doc);


    // selectedReport


    function showReportModal(doc: reportDataType) {
        if (doc.source_type === 'mindMap') {
            dispatch(attribMindMapModalData({
                ...doc,
                modal: true
            }));
        } else {
            // summary, study guide, FAQ, briefing, podcast
            dispatch(selectedReport(doc));
        }
    }



    return (
        <>

            <div className="px-4 py-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search reports..."
                        className="pl-9 ring-0 bg-transparent"
                    />
                </div>
            </div>


            {loading ? <DocRowSkeleton count={16} /> : (
                filteredSources?.length > 0 ? filteredSources?.map((doc) => (
                    <div
                        key={doc._id}
                        onClick={() => showReportModal(doc)}
                        className="flex items-center gap-2 hover:bg-muted p-2 ml-2.5 mr-2.5 rounded-md"
                    >
                        <SourceIcon source_type={doc?.source_type} />
                        <div className="flex flex-col">
                            <span className="flex-1   text-muted-foreground hover:bg-muted hover:text-foreground text-sm">{truncateTitle(doc?.title, 40)} </span>
                            <span className=" text-muted-foreground hover:bg-muted hover:text-foreground text-xs">  {doc?.source_type} - sources ({doc?.total_source}) </span>
                        </div>
                    </div>
                )) : (
                    <div className="flex justify-center">

                        <h1> No report found</h1>
                    </div>
                )


            )}




        </>


    );
}







type DocRowSkeletonProps = {
    count?: number; // number of rows to render
};

const DocRowSkeleton: React.FC<DocRowSkeletonProps> = ({ count = 5 }) => {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, idx) => (
                <div
                    key={idx}
                    className="flex items-center gap-2 p-2 m-2 rounded-md animate-pulse bg-muted"
                >
                    {/* Icon placeholder */}
                    <div className="w-5 h-5 bg-muted-foreground/20 rounded" />
                    {/* Title placeholder */}
                    <div className="flex-1 h-4 bg-muted-foreground/20 rounded" />
                    {/* Checkbox placeholder */}
                    {/* <div className="w-5 h-5 bg-muted-foreground/20 rounded" /> */}
                </div>
            ))}
        </div>
    );
};





function SourceIcon({ source_type }: { source_type: string }) {
    if (source_type === 'mindMap') return <BrainCircuit className="text-emerald-500" />;
    if (source_type === 'Study guide') return <GraduationCap className="text-[var(--l-moss)]" />;
    if (source_type === 'summary') return <AlignLeft className="text-blue-500" />;
    if (source_type === 'FAQ') return <HelpCircle className="text-amber-500" />;
    if (source_type === 'Briefing') return <Briefcase className="text-violet-500" />;
    if (source_type === 'podcast') return <Headphones className="text-rose-500" />;
    return <FileText className="text-muted-foreground" />;
}






export default ReportList;




