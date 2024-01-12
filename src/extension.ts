import * as vscode from 'vscode'
import { File } from './file'
import { getActiveEditor } from './utils'

export async function activate(context: vscode.ExtensionContext) {
  let editor = getActiveEditor()
  if (!editor) return

  File.getInstance().handlerFile(editor.document.fileName)
}

export function deactivate() {
  File.getInstance().dispose()
}
