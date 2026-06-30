"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = {
  id: string;
  label: string;
  image: string; // image URL or /public path
};

type ImageSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function ModelSelection({
  options,
  value,
  onChange,
  className,
}: ImageSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? options[0];



  function getModelName(label:string){
 const modelToArray=label.split('/')
   const modelName=modelToArray.pop() as string
   return modelName
  }


  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 focus:outline-none",
          className
        )}
      >
        <img
          src={selected.image}
          alt={selected.label}
          className="h-4 w-4 rounded-full object-cover"
        />

        {/* <span>{ getModelName(selected.label)}</span> */}

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown (opens UP) */}
      {open && (
        <div className="absolute overflow-y-auto h-50 w-45 bottom-full z-50 mb-1 min-w-full rounded-lg border border-border bg-background shadow-md">
          {options.map((opt) => ( 
            <button
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
            >
              <img
                src={opt.image}
                alt={opt.label}
                className="h-4 w-4 rounded-full object-cover"
              />
              <span className="whitespace-nowrap text-foreground">
                { getModelName(opt.label)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
