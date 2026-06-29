
'use client';

import { Input } from "../ui/input";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

type EmojiInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
};

export const EmojiPickerInput = ({ value, onChange, placeholder, id, name }: EmojiInputProps) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const togglePicker = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setOpen((p) => !p);
  };

const handleEmojiSelect = (emojiData: EmojiClickData) => {
  onChange((value ?? "") + emojiData.emoji);
  setOpen(false);
};

  if (!mounted) return null;

  return (
    <div className="relative flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        id={id}
        name={name}
        className="pr-10" // add padding for emoji button
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePicker}
        className="absolute right-2 text-xl"
      >
        😊
      </button>

      {open &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-[99999] bg-background rounded-lg shadow-xl border border-border"
            style={{
              top: pos.top,
              left: pos.left,
              pointerEvents: "auto",
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div style={{ maxHeight: 360, overflow: "auto", overscrollBehavior: "contain" }}>
              <EmojiPicker
                width={360}
                height={320}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
                onEmojiClick={handleEmojiSelect}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
 