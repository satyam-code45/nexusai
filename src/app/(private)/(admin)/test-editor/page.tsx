"use client"

import { useEffect, useRef, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { UserMouse } from "@/components/collaboration/UserMouse"
import { BlinkingCursor } from "@/components/collaboration/BlinkingCursor";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Undo } from "lucide-react";

export default function Page() {

  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const { cursor } = useSelector(
    (state: RootState) => state.aiEditor
  );

  const [mousePosition, setMousePosition] = useState({
    userName: "",
    x: 0,
    y: 0,
  });

  
  const [remoteCursor, setRemoteCursor] = useState({ x: 0, y: 0 });

  // // 2. Get the shared map from the doc directly
  const yMouse = ydocRef.current.getMap("mouse-location");
  const yCursor = ydocRef.current.getMap("cursor-location");


  const onMouseMove = (e: React.MouseEvent) => {
    // Update local state for immediate feedback (optional)
    const newPos = { userName: "Bienfait", x: e.clientX, y: e.clientY };
    setMousePosition(newPos)

    // Update the shared Yjs Map - This triggers the broadcast
    yMouse.set("userName", "Bienfait");
    yMouse.set("x", e.clientX);
    yMouse.set("y", e.clientY);
  };

  useEffect(() => {
    if (!yCursor) return;

    yCursor.set("x", cursor.x);
    yCursor.set("y", cursor.y);
  }, [cursor.x, cursor.y]);


  useEffect(() => {


    ydocRef.current.destroy()

    const provider = new WebsocketProvider(
      "ws://localhost:1234",
      "ben-11000",
      ydocRef.current
    );

    //   // 3. Listen for changes from OTHER users
    const observeMouse = () => {
      setMousePosition({
        userName: yMouse.get("userName") as string,
        x: yMouse.get("x") as number,
        y: yMouse.get("y") as number,
      });
    };


    const observeCursor = () => {
      setRemoteCursor({
        x: yCursor.get("x") as number,
        y: yCursor.get("y") as number,
      });
    };

    yCursor.observe(observeCursor);



    yMouse.observe(observeMouse);

    provider.on("status", (event: any) => {
      console.log("🔌 Status:", event.status);
    });

    return () => {
      // Cleanup to prevent memory leaks and multiple connections
      yCursor.unobserve(observeCursor);
      yMouse.unobserve(observeMouse);
      provider.disconnect();
      ydocRef.current.destroy();
    };
  }, []);

  return (
    <div
  onMouseMove={onMouseMove}
  className="
    min-h-screen relative overflow-hidden 
    bg-gradient-to-br 
      from-blue-50 to-indigo-100 
      dark:from-gray-800 dark:to-gray-900 
    transition-colors duration-200
  "
>
  {/* Cursor info */}
  <div className="p-2 text-gray-900 dark:text-gray-100">
    Cursor position: {JSON.stringify(remoteCursor)}
  </div>

  {/* Example toolbar icon */}
  <ToolbarIcon func={() => ""} Icon={Undo} />
</div>
  );
}

function ToolbarIcon({ Icon, func }: { Icon: any; func: () => void }) {
  return (
    <button
      onClick={func}
      className="
        p-1.5 rounded 
        text-gray-900 dark:text-gray-100 
        hover:bg-gray-100 dark:hover:bg-gray-700 
        transition-colors duration-200
      "
    >
      <Icon size={16} />
    </button>
  );
}