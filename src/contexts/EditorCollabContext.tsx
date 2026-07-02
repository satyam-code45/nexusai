"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { WebsocketProvider } from "y-websocket";

interface EditorCollabCtx {
  provider: WebsocketProvider | null;
  registerProvider: (p: WebsocketProvider | null) => void;
  /** Call immediately after any source is added or deleted — notifies peers. */
  broadcastSourceUploaded: () => void;
  /** Call when a new report (summary, FAQ, mindmap…) finishes generating. */
  broadcastReportGenerated: () => void;
  /** Call when the local user's chat stream ends — notifies peers to refetch history. */
  broadcastNewChatMessage: () => void;
  /**
   * Set to true before dispatching a viewPdf update that came from a peer.
   * MiddlePanel reads this flag and skips re-broadcasting to break the echo loop.
   */
  peerTriggeredViewRef: React.MutableRefObject<boolean>;
}

const EditorCollabContext = createContext<EditorCollabCtx>({
  provider: null,
  registerProvider: () => {},
  broadcastSourceUploaded: () => {},
  broadcastReportGenerated: () => {},
  broadcastNewChatMessage: () => {},
  peerTriggeredViewRef: { current: false },
});

export function EditorCollabProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const peerTriggeredViewRef = useRef(false);

  const registerProvider = useCallback((p: WebsocketProvider | null) => {
    providerRef.current = p;
    setProvider(p);
  }, []);

  const broadcastSourceUploaded = useCallback(() => {
    providerRef.current?.awareness.setLocalStateField("sourceListVersion", Date.now());
  }, []);

  const broadcastReportGenerated = useCallback(() => {
    providerRef.current?.awareness.setLocalStateField("reportListVersion", Date.now());
  }, []);

  const broadcastNewChatMessage = useCallback(() => {
    providerRef.current?.awareness.setLocalStateField("chatVersion", Date.now());
  }, []);

  return (
    <EditorCollabContext.Provider value={{ provider, registerProvider, broadcastSourceUploaded, broadcastReportGenerated, broadcastNewChatMessage, peerTriggeredViewRef }}>
      {children}
    </EditorCollabContext.Provider>
  );
}

export const useEditorCollab = () => useContext(EditorCollabContext);
