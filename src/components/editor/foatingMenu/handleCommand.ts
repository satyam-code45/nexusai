import { Editor } from "@tiptap/react";

 export const handleCommand = (props:{command: string, value?: any,editor?: Editor | null}) => {
    const {command,value,editor}=props
    if(!editor) return
        switch (command) {
            // Block Types
            case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
            case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
            case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
            case 'paragraph': editor.chain().focus().setParagraph().run(); break;
            case 'bulletList': editor.chain().focus().toggleBulletList().run(); break;
            case 'orderedList': editor.chain().focus().toggleOrderedList().run(); break;
            case 'codeBlock': editor.chain().focus().toggleCodeBlock().run(); break;
            case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
            case 'table': editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;

            // Inline Styles
            case 'bold': editor.chain().focus().toggleBold().run(); break;
            case 'italic': editor.chain().focus().toggleItalic().run(); break;
            case 'underline': editor.chain().focus().toggleUnderline().run(); break;
            case 'highlight': editor.chain().focus().toggleHighlight({ color: value }).run(); break;
            case 'undo': editor.chain().focus().undo().run(); break;
            case 'redo': editor.chain().focus().redo().run(); break;

         

        }
      
    };