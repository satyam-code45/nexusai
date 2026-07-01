import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export type CursorCoords = {
  x: number
  y: number
}

export const CursorPosition = Extension.create<{
  onUpdate?: (coords: CursorCoords) => void
}>({
  name: 'cursorPosition',

  addProseMirrorPlugins() {
    const { onUpdate } = this.options
    let lastCoords = { x: -1, y: -1 }

    return [
      new Plugin({
        key: new PluginKey('cursor-position'),

        view() {
          return {
            update(view, prevState) {
              const { state } = view
              const { selection } = state
              
              // 1. OPTIMIZATION:
              // Only calculate coordinates if the selection (cursor position) 
              
              if (
                prevState &&
                prevState.doc.eq(state.doc) &&
                prevState.selection.eq(selection)
              ) {
                return
              }

              // 2. VALIDATION:
              // Ensure editor is focused, connected, and we have a simple cursor (not a text block selection)
              if (!selection.empty || !view.dom.isConnected) return

              try {
                // 3. CALCULATION:
                // Get the position of the cursor in the viewport
                const pos = selection.from
                const coords = view.coordsAtPos(pos)
                
                if (!coords) return

                // 4. DEBOUNCE:
                // If coordinates are identical to the last frame, do nothing.
                if (
                  coords.left === lastCoords.x &&
                  coords.top === lastCoords.y
                ) return

                lastCoords = { x: coords.left, y: coords.top }

                // 5. TRIGGER:
                onUpdate?.({
                  x: coords.left,
                  y: coords.top,
                })

                // console.log("Cursor move (Type or Click):", coords.left, coords.top)

              } catch (e) {
                // Silent catch for edge cases where coordsAtPos might fail
              }
            },
          }
        },
      }),
    ]
  },
})