import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Code,
    Table,
    Quote,
    Type,
} from "lucide-react";

import { Editor } from "@tiptap/react";
import { Divider, TextFormattingMenu } from "../TextMenu";

interface TextFormatting {
    showMenu: boolean;
    editor: Editor
    onExecute: (action: string) => void;
}

export function TextFormattingPanel({ showMenu, editor, onExecute }: TextFormatting) {
    if (!showMenu) return null;
    const run = (command: () => void) => {
        command();
    };
    return (
       <div
  onPointerDown={(e) => e.stopPropagation()}
  className="
    absolute top-full mt-2 w-72 rounded-xl
    bg-background
    border border-border
    shadow-xl
    p-3 space-y-0.5
    transition-colors duration-200
  "
>
  {/* Divider */}
  <div className="h-px bg-border my-1" />

            <TextFormattingMenu icon={Type} label="Text"
                onClick={() => run(() =>
                    editor.chain().focus().setParagraph().run()
                )}
            />
            <TextFormattingMenu icon={Heading1} label="Heading 1"
                onClick={() => run(() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                )}
            />
            <TextFormattingMenu icon={Heading2} label="Heading 2"
                onClick={() => run(() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                )}
            />
            <TextFormattingMenu icon={Heading3} label="Heading 3"
                onClick={() => run(() =>
                    editor.chain().focus().toggleHeading({ level: 3 }).run()
                )}
            />


            <Divider />

            <TextFormattingMenu icon={List} label="Bulleted List"
                onClick={() => run(() =>
                    editor.chain().focus().toggleBulletList().run()
                )}
            />
            <TextFormattingMenu icon={ListOrdered} label="Numbered List"
                onClick={() => run(() =>
                    editor.chain().focus().toggleOrderedList().run()
                )}
            />

            <Divider />

            <TextFormattingMenu icon={Code} label="Code Block"
                onClick={() => run(() =>
                    editor.chain().focus().toggleCodeBlock().run()
                )}
            />

            <TextFormattingMenu icon={Quote} label="Block Quote"
                onClick={() => run(() =>
                    editor.chain().focus().toggleBlockquote().run()
                )}
            />

        </div>
    );
}