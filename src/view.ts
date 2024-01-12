import {
  Disposable,
  TextEditorDecorationType,
  ThemeColor,
  window,
  workspace,
  TextEditor,
  DecorationRangeBehavior
} from 'vscode'
import { getActiveEditor, getConfig } from './utils'

export class View {
  private readonly configChange: Disposable
  private decorationType: TextEditorDecorationType
  private fontColor: string
  private bgcColor: string

  constructor() {
    this.decorationType = window.createTextEditorDecorationType({
      rangeBehavior: DecorationRangeBehavior.OpenOpen,
      textDecoration: 'none'
    })

    this.fontColor = getConfig('fontColor').split(';')[0]
    this.bgcColor = getConfig('backgroundColor').split(';')[0]

    this.configChange = workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('simple-logs')) {
        this.fontColor = getConfig('fontColor').split(';')[0]
        this.bgcColor = getConfig('backgroundColor').split(';')[0]
      }
    })
  }

  public async createTextDecoration(text: string, editor: TextEditor, line: number): Promise<void> {
    // this.removeDclearecoration()
    let range = editor.document.lineAt(line).range

    editor?.setDecorations?.(this.decorationType, [
      {
        renderOptions: {
          after: {
            contentText: text,
            margin: '0 0 0 3em',
            color: this.fontColor ? this.fontColor : new ThemeColor('editorCodeLens.foreground'),
            backgroundColor: this.bgcColor ? this.bgcColor : undefined
          }
        },
        range
      }
    ])
  }

  public removeDclearecoration(): void {
    const editor = getActiveEditor()
    editor?.setDecorations?.(this.decorationType, [])
  }

  public dispose(): void {
    this.configChange.dispose()
    this.decorationType.dispose()
  }
}
