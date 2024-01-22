import * as vscode from 'vscode'
import { File } from './file'
import { getActiveEditor } from './utils'

export async function activate(context: vscode.ExtensionContext) {
  let editor = getActiveEditor()
  if (!editor) return

  File.getInstance().handlerFile(editor.document.fileName)

  context.subscriptions.push(
    vscode.commands.registerCommand('simple-logs.clearCache', () => {
      File.getInstance().clearCache(true)
    })
  )
}

export function deactivate() {
  File.getInstance().dispose()
}
