import { makeHttpReq } from '@/lib/helper/makeHttpReq'
import { Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    autocomplete: {
      setAutocomplete: (value: boolean) => ReturnType
    }
  }
}

// Must have at least this many real characters before triggering
const MIN_TEXT_LENGTH = 40
// User must type this many keys after accepting before next suggestion fires
const KEYSTROKES_AFTER_ACCEPT = 6

/** Strip HTML tags and return only the visible text for ghost-text display */
function htmlToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? div.innerText ?? '').trim()
}

async function insertAISuggestion(editor: Editor, aiHTML: string) {
  if (!editor) return
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = aiHTML
  const fragment = ProseMirrorDOMParser.fromSchema(editor.schema).parse(tempDiv)
  editor.commands.insertContent(fragment)
}

export const Autocomplete = Extension.create({
  name: 'autocomplete',

  addOptions() {
    return {
      pauseDuration: 3000,
      suggestion: '',
    }
  },

  addCommands() {
    return {
      setAutocomplete:
        (value: boolean) =>
        ({ editor }: { editor: Editor }) => {
          this.storage.enabled = value
          return true
        },
    }
  },

  addStorage() {
    return {
      enabled: false,
      ghostText: null as string | null,     // raw HTML from AI (for insertion)
      displayText: null as string | null,   // plain text (for decoration display)
      suggestionPos: null as number | null,
    }
  },

  addProseMirrorPlugins() {
    let typingTimer: ReturnType<typeof setTimeout> | null = null
    let keystrokesAfterAccept = KEYSTROKES_AFTER_ACCEPT // start "ready"
    let fetchSeqId = 0 // incremented before each fetch; stale responses are discarded
    const { pauseDuration } = this.options

    const clearGhost = (view: any) => {
      if (this.storage.ghostText !== null || this.storage.displayText !== null) {
        fetchSeqId++ // invalidate any in-flight fetch so it can't resurface
        this.storage.ghostText = null
        this.storage.displayText = null
        this.storage.suggestionPos = null
        view.dispatch(view.state.tr)
      }
    }

    return [
      new Plugin({
        key: new PluginKey('autocomplete-ghost'),
        props: {
          decorations: (state) => {
            const displayText = this.storage.displayText
            const pos = this.storage.suggestionPos

            if (!displayText || pos == null) return DecorationSet.empty

            const decorations: Decoration[] = []

            // Ghost text — plain text, italic, light gray
            decorations.push(
              Decoration.widget(pos, () => {
                const span = document.createElement('span')
                span.setAttribute('data-autocomplete-ghost', 'true')
                span.style.color = '#94a3b8'
                span.style.fontStyle = 'italic'
                span.style.pointerEvents = 'none'
                span.style.userSelect = 'none'
                span.textContent = displayText   // plain text — no raw HTML tags
                return span
              }, { side: 1 })
            )

            // "Tab to accept · Esc to dismiss" hint badges
            decorations.push(
              Decoration.widget(pos, () => {
                const wrap = document.createElement('span')
                wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:8px;pointer-events:none;user-select:none;vertical-align:middle'

                const makeHint = (key: string, action: string, color: string, bg: string, border: string) => {
                  const hint = document.createElement('span')
                  hint.style.cssText = 'display:inline-flex;align-items:center;gap:3px'

                  const kbd = document.createElement('kbd')
                  kbd.style.cssText = `display:inline-block;padding:1px 5px;border-radius:4px;border:1px solid ${border};background:${bg};color:${color};font-size:10px;font-family:ui-monospace,monospace;font-style:normal;font-weight:600;line-height:1.4`
                  kbd.textContent = key

                  const label = document.createElement('span')
                  label.style.cssText = `font-size:10px;color:${color};opacity:0.8;font-style:normal;font-weight:500`
                  label.textContent = action

                  hint.appendChild(kbd)
                  hint.appendChild(label)
                  return hint
                }

                wrap.appendChild(makeHint('Tab', 'to accept', '#7c3aed', '#ede9fe', '#c4b5fd'))

                const sep = document.createElement('span')
                sep.style.cssText = 'font-size:10px;color:#cbd5e1;font-style:normal'
                sep.textContent = '·'
                wrap.appendChild(sep)

                wrap.appendChild(makeHint('Esc', 'to dismiss', '#64748b', '#f1f5f9', '#cbd5e1'))

                return wrap
              }, { side: 2 })
            )

            return DecorationSet.create(state.doc, decorations)
          },

          handleKeyDown: (view, event) => {
            if (!this.storage.enabled) return false

            // Cancel any pending timer immediately on any keystroke
            if (typingTimer) {
              clearTimeout(typingTimer)
              typingTimer = null
            }

            // ── Accept with Tab ───────────────────────────────────────────
            if (event.key === 'Tab' && this.storage.ghostText) {
              event.preventDefault()
              const aiHTML = this.storage.ghostText
              const editor = this.editor
              if (!editor) return false

              clearGhost(view)
              insertAISuggestion(editor, aiHTML)

              keystrokesAfterAccept = 0  // start cooldown
              return true
            }

            // ── Dismiss ghost ─────────────────────────────────────────────
            // Any key other than Tab clears the ghost.  Escape gets a clean
            // dismiss (no side-effect); Enter/others fall through so
            // ProseMirror can still handle them (e.g. newline on Enter).
            // Either way, reset the cooldown so the same suggestion can't
            // re-appear until the user types KEYSTROKES_AFTER_ACCEPT new chars.
            if (this.storage.ghostText) {
              keystrokesAfterAccept = 0
              if (event.key === 'Escape') {
                event.preventDefault()
                clearGhost(view)
                return true  // swallow Escape — only dismiss, nothing else
              }
              clearGhost(view)
              // fall through — let Enter / other keys do their normal thing
            }

            // ── Hard guard: editor must have real text ────────────────────
            const editorInstance = this.editor
            if (!editorInstance) return false
            if (editorInstance.isEmpty) return false
            const textLength = editorInstance.getText().trim().length
            if (textLength < MIN_TEXT_LENGTH) return false

            // ── Non-content keys: don't schedule a suggestion ─────────────
            const ignoredKeys = new Set([
              'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
              'Shift','Control','Alt','Meta','CapsLock',
              'Escape','Tab','Enter',
              'Home','End','PageUp','PageDown',
              'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
            ])
            if (ignoredKeys.has(event.key)) return false

            // ── Cooldown after acceptance or dismissal ────────────────────
            if (keystrokesAfterAccept < KEYSTROKES_AFTER_ACCEPT) {
              keystrokesAfterAccept++
              return false
            }

            // ── Schedule suggestion ───────────────────────────────────────
            typingTimer = setTimeout(async () => {
              const editor = this.editor
              if (!editor) return

              // Double-check (async; editor state may have changed)
              if (editor.isEmpty) return
              const plainText = editor.getText().trim()
              if (plainText.length < MIN_TEXT_LENGTH) return

              // Capture a request ID — if a newer fetch starts before this one
              // resolves, the result will be discarded (last-writer-wins prevention)
              const mySeqId = ++fetchSeqId

              // Use plain text positions — not HTML string offsets — for context window.
              // editor.state.selection.from is a ProseMirror position, not a char index in HTML.
              const fullText = editor.getText()
              const pmFrom = editor.state.selection.from
              // Approximate text offset: count text content up to cursor
              const textBefore = editor.state.doc.textBetween(0, pmFrom, '\n', '\n')
              const textAfter = editor.state.doc.textBetween(pmFrom, editor.state.doc.content.size, '\n', '\n')

              const MAX_CHARS = 2000
              const prevWords = textBefore.slice(-MAX_CHARS)
              const nextWords = textAfter.slice(0, MAX_CHARS)

              const aiHTML = await fetchSuggestion(prevWords, nextWords)

              // Discard stale responses from older fetch calls
              if (mySeqId !== fetchSeqId) return
              if (!aiHTML) return

              // Re-read cursor position after the async gap — it may have moved
              const currentFrom = editor.state.selection.from

              // Store both the raw HTML (for insertion) and plain text (for display)
              this.storage.ghostText = aiHTML
              this.storage.displayText = htmlToPlainText(aiHTML)
              this.storage.suggestionPos = currentFrom
              view.dispatch(view.state.tr)
            }, pauseDuration)

            return false
          },
        },
      }),
    ]
  },
})

async function fetchSuggestion(previousWords: string, nextWords: string) {
  try {
    const data = await makeHttpReq('POST', 'documents/autocomplete', {
      previousWords,
      nextWords,
    }) as { res: string }
    return data?.res ?? null
  } catch {
    return null
  }
}
