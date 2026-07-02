"use client";

import React, { useEffect, useState, useRef } from "react";
import { Users } from "lucide-react";
import { WebsocketProvider } from "y-websocket";

interface UserState {
  name?: string;
  email?: string;
  color?: string;
  id?: number;
}

interface CollaborativeUsersProps {
  provider: WebsocketProvider
}

export const CollaborativeUsers = ({ provider }: CollaborativeUsersProps) => {
  const [users, setUsers] = useState<UserState[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!provider?.awareness) return;

    const updateUsers = () => {
      const userArray = Array.from(provider.awareness.getStates().entries())
        .filter(([, s]: any) => s.user)
        .map(([, s]: any) => s.user as UserState);
      setUsers(userArray);
    };

    provider.awareness.on("change", updateUsers);
    updateUsers();

    return () => provider.awareness.off("change", updateUsers);
  }, [provider]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUsers(false);
      }
    };

    if (showUsers) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUsers]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowUsers(!showUsers)}
        title="View connected users"
        className="relative p-2 rounded-full hover:bg-muted transition-all duration-200"
      >
        <Users size={20} className="text-muted-foreground" />
        {users.length > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white border-2 border-white dark:border-gray-900">
            {users.length}
          </span>
        )}
      </button>

      {showUsers && (
        <div className="absolute top-full right-0 mt-2 w-64 z-[100] bg-background border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Users ({users.length})
            </span>
          </div>

          <ul className="max-h-72 overflow-y-auto">
            {users.length === 0 ? (
              <li className="p-4 text-center text-sm text-muted-foreground italic">
                No users online
              </li>
            ) : (
              users.map((user) => (
                <li
                  key={user.id ?? user.email ?? user.name}
                  className="flex items-center gap-3 p-3 hover:bg-muted transition-colors border-b last:border-0 border-border"
                >
                  <div 
                    className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: user.color || '#3b82f6' }}
                  >
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </div>

                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-sm font-medium text-foreground truncate">
                      {user.name || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email || "No email"}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};