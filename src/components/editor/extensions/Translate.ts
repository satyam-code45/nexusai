import { Editor, Extension } from '@tiptap/core'
import { EditorView } from '@tiptap/pm/view'
import { EditorState, Transaction } from '@tiptap/pm/state'
import { makeHttpReq } from '@/lib/helper/makeHttpReq'
interface RephraseCommandProps {
  editor: Editor
  state: EditorState
  view: EditorView
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    translate: {
      translate: (language?: string) => ReturnType
    }
  }
}

export const Translate = Extension.create({
  name: 'translate',
//  defines custom editor commands
  addCommands() {
    return {
      translate: (language = 'Spanish') => (async ({ editor, state, view }:RephraseCommandProps) => {


        const { from, to, empty } = state.selection
        if (empty) return false

        const selectedText = state.doc.textBetween(from, to, ' ')

        const translated=await translate(language, selectedText)
        // 1. HARDCODED SIMULATION DATA (No Fetch)
        const simulationData = translated ?? ''

        // 2. Clear the selection
        editor.chain().focus().deleteSelection().run()

        // 3. Helper for the "Typewriter" effect
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
        const words = simulationData.split(' ')
        let currentPos = from

        // 4. Stream Simulation
        for (const word of words) {
          const chunk = word + ' '
          
          // Insert the word at the current position
          const tr = view.state.tr.insertText(chunk, currentPos)

            tr.addMark(
            currentPos, 
            currentPos + chunk.length, 
            state.schema.marks.italic.create() 
          )
          
      

          view.dispatch(tr)
          currentPos += chunk.length

          // Realistic typing delay
          await sleep(50) 
        }
    

        return true
      }) as any,
    }
  },
})

async function translate(language: string, wordToTranslate: string) {
  
  const data = await makeHttpReq('POST', `documents/translate`,
    { language, wordToTranslate }) as {res:string}

    if(data?.res){
      return data?.res
    }
}
