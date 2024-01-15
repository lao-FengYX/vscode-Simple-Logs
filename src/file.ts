import { Disposable, TextEditor, window, workspace } from 'vscode'
import { formatDate } from './date'
import {
  getBlame,
  getGitFolder,
  getRelativePath,
  validHash,
  validUncommittedHash
} from './gitcommand'
import { Logger } from './logger'
import { UserInfo, getUserInfo } from './userInfo'
import { debounce, getActiveEditor, getConfig, validParentPathStart } from './utils'
import { View } from './view'

let userInfo: UserInfo
let view = new View()
let excludePath = getConfig('excludePath').split(',')
let useCustomaryWording = getConfig('useCustomaryWording')
let showInfo = getConfig('showInfo')

type LineInfo = {
  'hash': string
  's-hash': string
  'author': string
  'author-mail': string
  'author-time': string
  'author-tz': string
  'committer': string
  'committer-mail': string
  'committer-time': string
  'committer-tz': string
  'summary': string
  [key: string]: string
}

type Line = {
  'source': string
  'result': string
  'count': string
}

export class File {
  private isExecute: boolean = false // 是否正在执行
  private disposeable: Disposable
  private lineBlame = new Map<string, LineInfo>()
  private fileBlame = new Map<string, Map<string, LineInfo>>()
  private static instance?: File
  public isEdit: boolean = false

  constructor() {
    this.disposeable = Disposable.from(
      view,
      workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('simple-logs')) {
          excludePath = getConfig('excludePath').split(',')
          useCustomaryWording = getConfig('useCustomaryWording')
          showInfo = getConfig('showInfo')
        }
      }),
      window.onDidChangeActiveTextEditor(e => {
        if (e) {
          this.handlerFile(e.document.fileName)
        }
      }),
      window.onDidChangeTextEditorSelection(({ textEditor }) => {
        const { scheme } = textEditor.document.uri
        if (scheme === 'file' || scheme === 'untitled') {
          let parentPath = workspace.workspaceFolders?.[0].uri.fsPath || ''
          const path = getRelativePath(textEditor.document.fileName, parentPath)
          if (this.isEdit) return
          this.selectChange(path, true)
        }
      }),
      // workspace.onDidSaveTextDocument(() => {
      //   let editor = getActiveEditor()
      //   if (!editor || this.isEdit) return
      //   handlerFile(editor.document.fileName)
      // }),
      // workspace.onDidCloseTextDocument(async document => {
      //   if (document.uri.fsPath.endsWith('.git')) {
      //     return
      //   }

      //   let dir = workspace.workspaceFolders?.[0].uri.fsPath || ''
      //   const path = getRelativePath(document.fileName, dir)
      //   fileBlame.delete(path)
      // }),
      workspace.onDidChangeTextDocument(({ contentChanges, document }) => {
        let editor = getActiveEditor()
        if (!editor) return
        if (contentChanges.length) {
          if (editor?.document === document) {
            this.isEdit = true
            view.removeDclearecoration()
            delayFn(editor)
          }
        }
      })
    )
  }

  static getInstance(): File {
    File.instance ??= new File()
    return File.instance
  }

  async handlerFile(filePath: string, removeDecoration = true): Promise<void> {
    if (this.isExecute) return
    let editor = getActiveEditor()
    if (!editor) return

    let parentPath = workspace.workspaceFolders?.[0].uri.fsPath || ''
    if (!validParentPathStart(parentPath, filePath)) return

    // 截取盘符后面的路径进行比对
    let dividePath = filePath?.split('\\')?.slice(1) ?? []
    if (excludePath.some(i => dividePath.includes(i.trim()))) return

    let gitPath = await getGitFolder(filePath)
    if (!gitPath) {
      Logger.info('No git directory found')
      return
    }

    if (!userInfo) {
      userInfo = await getUserInfo()
    }

    const arr = await getBlame(filePath)
    let obj = this.chunkArr(arr)

    if (!Reflect.ownKeys(obj).length) {
      Logger.info('No information for current file')
      return
    }

    this.blameProcess(obj)

    const path = getRelativePath(filePath, parentPath)
    this.fileBlame.set(path, this.lineBlame)

    this.isExecute = false

    this.selectChange(path, removeDecoration)
  }

  private commitInfo = (): LineInfo => ({
    'hash': '',
    's-hash': '',
    'author': '',
    'author-mail': '',
    'author-time': '',
    'author-tz': '',
    'committer': '',
    'committer-mail': '',
    'committer-time': '',
    'committer-tz': '',
    'summary': ''
  })

  private createLineObj = (): Line => ({
    'source': '',
    'result': '',
    'count': ''
  })

  private chunkArr = (arr: string[][]) => {
    let obj: { [key: string]: string[][] } = {}
    let indexArr = arr
      .map((item, index) => (validHash(item?.[0]) ? index + '' : undefined))
      .filter(Boolean) as string[]

    for (let i = 0; i < indexArr.length; i++) {
      obj[i + ''] = arr.slice(
        parseInt(indexArr[i]),
        indexArr[i + 1] === void 0 ? arr.length : parseInt(indexArr[i + 1])
      )

      if (obj[i + ''].length !== 12) {
        let temp = obj[i + ''][0][1]
        for (const item of Object.values(obj)) {
          if (item[0][0] === obj[i + ''][0][0]) {
            obj[i + ''] = structuredClone(item)
            obj[i + ''][0][1] = temp
            break
          }
        }
      }
    }
    return obj
  }

  private blameProcess = (obj: { [key: string]: string[][] }): void => {
    this.lineBlame = new Map<string, LineInfo>()

    for (const key in obj) {
      let arr = obj[key]
      let temp: LineInfo = this.commitInfo()
      let lineObj = this.createLineObj()
      for (const [name, val] of arr) {
        if (['filename', 'boundary', 'previous'].includes(name)) continue
        if (validHash(name)) {
          temp['hash'] = name
          temp['s-hash'] = name.slice(0, 7)
          let [source, result, count] = val.split(' ')
          lineObj['source'] = source
          lineObj['result'] = result
          lineObj['count'] = count
        } else {
          if (name.includes('-mail')) {
            temp[name] = val.slice(1, val.length - 1)
          } else {
            temp[name] = val
          }
        }
      }

      this.loopSetLineBlame(lineObj, temp)
    }
  }

  private loopSetLineBlame = (line: Line, temp: LineInfo): void => {
    for (let i = 0; i < parseInt(line.count); i++) {
      if (validUncommittedHash(temp.hash)) {
        temp.author = temp.committer = userInfo.name
        temp['author-mail'] = temp['committer-mail'] = userInfo.email
        temp.summary = 'Uncommitted changes'
      }
      this.lineBlame.set(parseInt(line.result) + i + '', temp)
    }
  }

  private selectChange = (path: string, removeDecoration = true): void => {
    let editor = getActiveEditor()
    if (!editor) return
    let map = this.fileBlame.get(path)
    if (!map) return

    removeDecoration ? view.removeDclearecoration() : null

    let line = editor.selection.active.line + 1
    let text = editor.document.lineAt(line - 1).text.trim()
    if (line >= editor.document.lineCount && text === '') return

    let findObj = map?.get(line + '')
    if (findObj) {
      let info = showInfo.replace(/\$\{(.*?)\}/g, (_, key) => {
        if (findObj) {
          return this.organizeInformation(findObj, key?.trim() ?? key)
        }
        return ''
      })

      view.createTextDecoration(info, editor, line - 1)
    }
  }

  private organizeInformation(findObj: LineInfo, key: string): string {
    let keys = Object.keys(this.commitInfo())
    if (!keys.includes(key)) {
      return ''
    }
    if (['committer', 'author'].includes(key)) {
      if (findObj?.[key] === userInfo.name && findObj?.[key + '-mail'] === userInfo.email) {
        return 'You'
      } else {
        return findObj?.[key] ?? ''
      }
    }
    if (key.includes('-time')) {
      return formatDate(
        new Date(),
        findObj ? new Date(parseInt(findObj[key]) * 1000) : new Date(),
        useCustomaryWording
      )
    }
    return `${findObj?.[key] ?? ''}`
  }

  public dispose(): void {
    File.instance = undefined
    this.lineBlame = new Map<string, LineInfo>()
    this.fileBlame = new Map<string, Map<string, LineInfo>>()
    this.disposeable.dispose()
  }
}

const delayFn = debounce((editor: TextEditor) => {
  File.getInstance().isEdit = false
  File.getInstance().handlerFile(editor.document.fileName, false)
  // 1000 毫秒以上拿到的数据才是新的
}, 1100)
