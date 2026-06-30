"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Action = {
  id: string;
  label: string;
  icon: any;
  iconColor: string;
};

export default function ActionSelect({
  actions,
  value,
  onChange,
  loading = false,
}: {
  actions: Action[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = actions.find((a) => a.id === value) ?? actions[0];
  const Icon = selected.icon;

  const filteredActionArray = useMemo(() => {
    return actions.filter((item) => item.label);
  }, [actions]);

  return (
    <div className="relative">
  {/* Trigger */}
  <button
    disabled={loading}
    onClick={() => setOpen((o) => !o)}
    className={cn(
      "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium focus:outline-none transition-colors duration-200",
      loading
        ? "cursor-not-allowed opacity-60"
        : "hover:bg-muted",
      "border-border bg-muted text-foreground"
    )}
  >
    {loading ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    ) : (
      <Icon className={cn("h-3.5 w-3.5", selected.iconColor)} />
    )}

    <span>{loading ? `Generating ${selected.label}...` : selected.label}</span>

    {!loading && <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />}
  </button>

  {/* Dropdown */}
  {open && !loading && (
    <div className="absolute bottom-full z-50 mb-1 w-full rounded-lg border bg-background border-border shadow-md transition-colors duration-200">
      {filteredActionArray.map((action) => {
        const ActionIcon = action.icon;

        return (
          <button
            key={action.id}
            onClick={() => {
              onChange(action.id);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors duration-200"
          >
            <ActionIcon className={cn("h-3.5 w-3.5", action.iconColor)} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  )}
</div>
  );
}
