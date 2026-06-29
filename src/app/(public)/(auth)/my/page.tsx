"use client"

import { useRef, useEffect } from "react"
import Editor from "@/components/editor/Editor"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"

const WS_URL = process.env.NEXT_PUBLIC_YWEBSOCKET_URL ?? "ws://localhost:1234";

function Page() {
    const ydocRef = useRef<Y.Doc>(new Y.Doc())
    const providerRef = useRef<WebsocketProvider>(
        new WebsocketProvider(WS_URL, "my-page-doc", ydocRef.current)
    )

    useEffect(() => {
        return () => {
            try { providerRef.current.destroy(); } catch {}
            try { ydocRef.current.destroy(); } catch {}
        };
    }, []);

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <Editor
                    initialHtml=""
                    initialTiptapJson={null}
                    initialTitle=""
                    projectId="my-page-doc"
                    workspaceKey="my-page-doc"
                    ydoc={ydocRef.current}
                    provider={providerRef.current}
                />


            </div>
        </>
    )
}

export default Page
