import * as vscode from 'vscode'
import { File } from './file'
import { getActiveEditor } from './utils'

const fileInstance: File = File.getInstance()

export async function activate(context: vscode.ExtensionContext) {
  let editor = getActiveEditor()
  if (!editor) return

  fileInstance.handlerFile(editor.document.fileName)

  context.subscriptions.push(
    vscode.commands.registerCommand('simple-logs.clearCache', () => {
      fileInstance.clearCache(true)
    })
  )
}

export function deactivate() {
  fileInstance.dispose()
}
