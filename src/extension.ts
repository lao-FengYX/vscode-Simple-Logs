import * as vscode from 'vscode'
import { dispose, handlerFile } from "./file";
import { getActiveEditor } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  let editor = getActiveEditor()
  if (!editor) return

  handlerFile(editor.document.fileName)
}

export function deactivate () {
  dispose.dispose()
}
