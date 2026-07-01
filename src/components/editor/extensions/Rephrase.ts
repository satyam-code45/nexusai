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
    rephrase: {
      rephrase: () => ReturnType
    }
  }
}

export const Rephrase = Extension.create({
  name: 'rephrase',
//  defines custom editor commands 
  addCommands() {
    return {
      rephrase: () => (async ({ editor, state, view }:RephraseCommandProps) => {
        
       
        const { from, to, empty } = state.selection
        if (empty) return false


         const selectedText = state.doc.textBetween(from, to, ' ')

        const aiRephaseText=await rephraseText('improve_writing',selectedText)
        // 1. HARDCODED SIMULATION DATA (No Fetch)
        const simulationData = aiRephaseText ?? ''
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


async function rephraseText( action: 'fix_grammar' | 'improve_writing' | 'rephrase', selectedText: string) {
  
  const data = await makeHttpReq('POST', `documents/rephrase`,
    { action, selectedText }) as {res:string}

    if(data?.res){
      return data?.res
    }
}
