"use client";


import { useEffect, useState } from "react";
import { ViewReportModal } from "./ViewReportModal";


export default function ViewReportModalWrapper() {
    const [ready, setReady] = useState(false);
 

    // Wait for client hydration
    useEffect(() => {
        setReady(true);
    }, []);


    if (!ready) return null;  // prevents hydration mismatch

    return <ViewReportModal />
}
