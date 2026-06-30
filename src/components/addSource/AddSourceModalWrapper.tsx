"use client";


import { useEffect, useState } from "react";

import AddSourceModal from "./AddSourceModal";


export default function AddSourceModalWrapper({ session, userId, projectId }: { projectId?: string, userId?: string, session: any }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(true);
    }, []);

    if (!ready) return null;

    return <AddSourceModal
        userId={session?.user?.id}
        projectId={projectId} />
}
