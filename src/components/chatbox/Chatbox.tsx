

"use client";

import { memo, useEffect, useRef, useState } from "react";
import { cn, showError } from "@/lib/utils";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";

import { MessageBubble } from "./MessageBubble";
import AIThinking from "./AIThinking";
import { AppDispatch, RootState } from "@/store";
import { addUserAndAiPlaceholder, appendToAssistantThinking, appendToLastAiMessage, getChatHistory } from "@/store/chatSlice";
import { ChatInput } from "./ChatInput";
import ChatBoxHeader from "./ChatBoxHeader";
import { useEditorCollab } from "@/contexts/EditorCollabContext";



export type Message = {
  role: "user" | "ai";
  text: string;
  time?: string;
};

type ChatBoxProps = {
  userId: string | undefined
  projectId: string | undefined
  roomId?: string | undefined
}
export default function ChatBox({ userId, projectId, roomId: roomIdProp }: ChatBoxProps) {

  const dispatch = useDispatch<AppDispatch>();
  const { provider, broadcastNewChatMessage } = useEditorCollab();
  const { activeRoom } = useSelector((state: RootState) => state.room);
  // Prefer live Redux state; fall back to URL prop so reload restores room-scoped history
  const roomId = activeRoom?.roomId ?? roomIdProp;

  const { messages, questions, error } = useSelector(
    (state: RootState) => state.chat
  );
  const { selectedProject, docIds, docs } = useSelector((state: RootState) => state.doc);

  // Load history on mount — room-scoped so all members' messages are included
  useEffect(() => {
    if (userId && projectId) {
      dispatch(getChatHistory({ userId, projectId, roomId }));
    }
  }, [userId, projectId, roomId, dispatch]);

  // Real-time: live streaming relay + final history refetch from peers
  const lastSeenChatVersionRef = useRef<number>(0);
  useEffect(() => {
    if (!provider || !userId || !projectId) return;
    const myClientId = provider.awareness.clientID;

    const handler = ({ added, updated }: { added: number[]; updated: number[]; removed: number[] }) => {
      [...added, ...updated].forEach(clientId => {
        if (clientId === myClientId) return;
        const peerState = provider.awareness.getStates().get(clientId);

        const peerStream = peerState?.streamingAiMessage;
        const peerVersion = peerState?.chatVersion ?? 0;

        if (peerStream?.active) {
          // Peer is streaming — feed new characters into the typewriter queue so peers
          // see the same character-by-character effect as the local user.
          // A stale chatVersion already in peer awareness would otherwise trigger a
          // history fetch while the bubble is still visible, causing a duplicate.
          const fullContent = peerStream.content ?? "";
          const delta = fullContent.slice(peerDisplayedLenRef.current);
          if (delta.length > 0) {
            peerDisplayedLenRef.current = fullContent.length;
            for (const char of delta) peerQueueRef.current.push(char);
            if (!peerTypingRef.current) peerTypeNext();
          }
          setPeerStreamStatus(peerStream.statusText ?? "");
          peerWasStreamingRef.current = true;
        } else if (peerWasStreamingRef.current) {
          // Stream just ended — reset peer typewriter state, clear bubble, then refetch.
          peerQueueRef.current = [];
          peerTypingRef.current = false;
          peerDisplayedLenRef.current = 0;
          setPeerStreamContent(null);
          setPeerStreamStatus("");
          peerWasStreamingRef.current = false;
          lastSeenChatVersionRef.current = peerVersion;
          dispatch(getChatHistory({ userId, projectId, roomId }));
        } else if (peerVersion > lastSeenChatVersionRef.current) {
          // Non-streaming chatVersion bump (another room member sent a message).
          lastSeenChatVersionRef.current = peerVersion;
          dispatch(getChatHistory({ userId, projectId, roomId }));
        }
      });
    };

    provider.awareness.on("change", handler);
    return () => provider.awareness.off("change", handler);
  }, [provider, userId, projectId, roomId, dispatch]);


  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  // Content of a peer's in-progress AI stream; null = no peer is streaming
  const [peerStreamContent, setPeerStreamContent] = useState<string | null>(null);
  const [peerStreamStatus, setPeerStreamStatus] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const typingRef = useRef(false);
  // Accumulated text of the local streaming response (for broadcasting to peers)
  const streamingAccumRef = useRef("");
  const streamingStatusRef = useRef("");
  const streamBroadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerWasStreamingRef = useRef(false);

  // Peer typewriter state
  const peerQueueRef = useRef<string[]>([]);
  const peerTypingRef = useRef(false);
  const peerDisplayedLenRef = useRef(0);





  const thinkingQueueRef = useRef<string[]>([]);
  const thinkingTypingRef = useRef(false);


  const typeNextThinking = () => {
    if (thinkingQueueRef.current.length === 0) {
      thinkingTypingRef.current = false;
      return;
    }

    thinkingTypingRef.current = true;


      const chunk = thinkingQueueRef.current
      .splice(0, 3)
      .join("");

    // dispatch(appendToLastAiMessage(chunk));

    // const nextChar = thinkingQueueRef.current.shift()!;
    dispatch(appendToAssistantThinking(chunk));

    setTimeout(typeNextThinking, 12);
  };




  const typeNext = () => {
    if (queueRef.current.length === 0) {
      typingRef.current = false;
      return;
    }

    typingRef.current = true;

    const chunk = queueRef.current
      .splice(0, 3)
      .join("");

    dispatch(appendToLastAiMessage(chunk));

    setTimeout(typeNext, 6); // ~60fps
  };

  const peerTypeNext = () => {
    if (peerQueueRef.current.length === 0) {
      peerTypingRef.current = false;
      return;
    }
    peerTypingRef.current = true;
    const chunk = peerQueueRef.current.splice(0, 3).join("");
    setPeerStreamContent(prev => (prev ?? "") + chunk);
    setTimeout(peerTypeNext, 6);
  };



  const sendMessage = async (props: { markdownImageUrl?: string | null, question?: string }) => {
    const { markdownImageUrl, question } = props
    const suggestedQuestion = question || ' '
    if (!projectId) {
      showError('Select a project')
      return
    }

    const userMessage = markdownImageUrl ?
      (input.trim() + ' ' + markdownImageUrl) + ' ' + suggestedQuestion
      : input.trim() + ' ' + suggestedQuestion

    // const userMessage=input.trim()
    queueRef.current = [];
    streamingAccumRef.current = "";
    streamingStatusRef.current = "";
    setStatusText("");
    setInput("");
    // Signal peers that local user has started streaming
    if (roomId && provider) {
      provider.awareness.setLocalStateField("streamingAiMessage", { content: "", statusText: "", active: true });
    }



    dispatch(
      addUserAndAiPlaceholder({
        userId: userId ?? "",
        content: userMessage,
      })
    );


    let receivedContent = false; // tracks whether any text chunk arrived
    try {
      setLoading(true)
      // Resolve selected source IDs → their fileUrls to pass as context filter
      const docUrls = docIds
        .map((id: string) => (docs as any[]).find((d) => d._id === id)?.fileUrl)
        .filter(Boolean) as string[];

      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage, userId, projectId, docUrls }),
      });

      if (!res.ok || !res.body) {
        showError("Failed to connect to chat stream");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Handle data events
          if (trimmed.startsWith("data:")) {
            const payload = trimmed.replace("data:", "").trim();
            if (!payload) continue;

            const data = JSON.parse(payload);

            //  queue valid messages
            if (data.message !== undefined && data.message !== null) {
              receivedContent = true;

              // push each character
              for (const char of data.message) {
                queueRef.current.push(char);
              }

              if (!typingRef.current) {
                typeNext();
              }

              // Throttle-broadcast accumulated content to peers every 150ms
              if (roomId && provider) {
                streamingAccumRef.current += data.message;
                if (!streamBroadcastTimerRef.current) {
                  streamBroadcastTimerRef.current = setTimeout(() => {
                    provider.awareness.setLocalStateField("streamingAiMessage", {
                      content: streamingAccumRef.current,
                      statusText: streamingStatusRef.current,
                      active: true,
                    });
                    streamBroadcastTimerRef.current = null;
                  }, 150);
                }
              }
            }

            // Thinking
            if (data.thinking !== undefined && data.thinking !== null) {

              // push each character
              for (const char of data.thinking) {
                thinkingQueueRef.current.push(char);
              }

              if (!thinkingTypingRef.current) {
                typeNextThinking();
              }

            }

            // Multi-agent status step (e.g. "Searching your documents...")
            if (data.status !== undefined && data.status !== null) {
              setStatusText(data.status);
              streamingStatusRef.current = data.status;
              // Immediately relay status to peers — no throttle, status is infrequent and important
              if (roomId && provider) {
                provider.awareness.setLocalStateField("streamingAiMessage", {
                  content: streamingAccumRef.current,
                  statusText: data.status,
                  active: true,
                });
              }
            }

          }


          // Handle event types: end / error
          else if (trimmed.startsWith("event:")) {
            const eventType = trimmed.replace("event:", "").trim();

            if (eventType === "end") {
              setLoading(false);
              setStatusText("");
              reader.cancel(); // stop reading
              // Cancel pending throttle timer — we'll do a final flush right now
              if (streamBroadcastTimerRef.current) {
                clearTimeout(streamBroadcastTimerRef.current);
                streamBroadcastTimerRef.current = null;
              }
              if (roomId && provider) {
                // Final flush: send ALL accumulated content to peers
                provider.awareness.setLocalStateField("streamingAiMessage", {
                  content: streamingAccumRef.current,
                  statusText: "",
                  active: true,
                });
                // Wait 300ms so peer can render final content, then clear and trigger history refetch
                setTimeout(() => {
                  provider.awareness.setLocalStateField("streamingAiMessage", null);
                  broadcastNewChatMessage();
                }, 300);
              } else if (roomId) {
                provider?.awareness.setLocalStateField("streamingAiMessage", null);
                broadcastNewChatMessage();
              }
            }

            if (eventType === "error") {
              setLoading(false);
              setStatusText("");
              reader.cancel();
              if (streamBroadcastTimerRef.current) {
                clearTimeout(streamBroadcastTimerRef.current);
                streamBroadcastTimerRef.current = null;
              }
              if (roomId && provider) provider.awareness.setLocalStateField("streamingAiMessage", null);
              if (!receivedContent) {
                dispatch(appendToLastAiMessage("Something went wrong — please try again."));
              }
            }
          }
        }
      }
    } catch (err) {
      setLoading(false);
      setStatusText("");
      if (streamBroadcastTimerRef.current) {
        clearTimeout(streamBroadcastTimerRef.current);
        streamBroadcastTimerRef.current = null;
      }
      if (roomId && provider) provider.awareness.setLocalStateField("streamingAiMessage", null);
      console.error("Fetch streaming error:", (err as Error).message);
      if (!receivedContent) {
        dispatch(appendToLastAiMessage("Network error — please check your connection and try again."));
      }
    }
  };

  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerStreamContent]);

  return (
    <div className="flex h-full flex-col bg-background transition-colors duration-200">
      {/* ---------------- HEADER ---------------- */}
      <ChatBoxHeader selectedProject={selectedProject} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!projectId ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--l-tint)]">
                <span className="text-xl">📁</span>
              </div>
              <p className="text-sm font-medium text-foreground">No project open</p>
              <p className="text-xs text-muted-foreground">Select a project to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {messages.length === 0 && peerStreamContent === null ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--l-tint)]">
                    <span className="text-2xl">✨</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Ask anything</p>
                    <p className="text-xs text-muted-foreground mt-0.5">About your sources, notes, or ideas</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble
                    loading={loading}
                    key={i}
                    message={msg}
                    statusText={i === messages.length - 1 ? statusText : undefined}
                  />
                ))}

                {/* Live stream from a peer — visible even when local message list is empty */}
                {peerStreamContent !== null && (
                  <MessageBubble
                    loading={true}
                    message={{ role: "ai", content: peerStreamContent, userId: "", thinking: "", time: "" }}
                    statusText={peerStreamStatus || "Teammate is asking…"}
                  />
                )}

                {/* Spacer for scrolling */}
                <div ref={bottomRef} className="mb-10" />
              </>
            )}
          </>
        )}
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        projectId={projectId}
        loading={loading}
        userId={userId}
        questions={questions}
      />
    </div>
  );
}


