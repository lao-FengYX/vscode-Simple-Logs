import { Disposable, TextEditor, window, workspace } from 'vscode'
import { formatDate } from './date'
import { getBlame, getGitFolder, validHash, validUncommittedHash } from './gitcommand'
import { Logger } from './logger'
import { UserInfo, getUserInfo } from './userInfo'
import { debounce, getActiveEditor, getConfig, validParentPathStart } from './utils'
import { View } from './view'
import { sep } from 'path'

let userInfo: UserInfo
let view = View.getInstance()
// 需要忽略的路径
let excludePath = getConfig('excludePath').split(',')
// 是否使用当前习惯用语
let useCustomaryWording = getConfig('useCustomaryWording')
// 显示的信息
let showInfo = getConfig('showInfo')
// 显示的未提交的信息
let showUncommittedInfo = getConfig('showUncommittedInfo')
// 是否只显示未提交的信息
let onlyShowUncommittedInfo = getConfig('onlyShowUncommittedInfo')

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
          showUncommittedInfo = getConfig('showUncommittedInfo')
          onlyShowUncommittedInfo = getConfig('onlyShowUncommittedInfo')
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
          if (this.isEdit) return
          this.selectChange(textEditor.document.fileName, true)
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

      //   this.fileBlame.delete(document.fileName)
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
    let dividePath = filePath?.split(sep)?.slice(1) ?? []
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

      this.lineBlame = new Map<string, LineInfo>()
      for (let i = 1; i < editor.document.lineCount + 1; i++) {
        this.lineBlame.set(i + '', this.commitInfo(true))
      }
    } else {
      this.blameProcess(obj)
    }

    this.fileBlame.set(filePath, this.lineBlame)

    this.isExecute = false

    this.selectChange(filePath, removeDecoration)
  }

  private commitInfo = (need?: boolean): LineInfo => ({
    'hash': need ? '0'.padEnd(40, '0') : '',
    's-hash': need ? '0'.padEnd(7, '0') : '',
    'author': need ? userInfo.name ?? '' : '',
    'author-mail': need ? userInfo.email ?? '' : '',
    'author-time': need ? +new Date() / 1000 + '' : '',
    'author-tz': need ? '+0800' : '',
    'committer': need ? userInfo.name ?? '' : '',
    'committer-mail': need ? userInfo.email ?? '' : '',
    'committer-time': need ? +new Date() / 1000 + '' : '',
    'committer-tz': need ? '+0800' : '',
    'summary': need ? showUncommittedInfo ?? '' : ''
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
        temp.summary = showUncommittedInfo
      }
      this.lineBlame.set(parseInt(line.result) + i + '', temp)
    }
  }

  private selectChange = (path: string, removeDecoration = true): void => {
    let editor = getActiveEditor()
    if (!editor) return
    let map = this.fileBlame.get(path)
    // if (!map) return

    removeDecoration ? view.removeDclearecoration() : null

    let line = editor.selection.active.line + 1
    let text = editor.document.lineAt(line - 1).text.trim()
    if (line >= editor.document.lineCount && text === '') return

    let findObj = map?.get(line + '')
    if (findObj) {
      let info: string = this.getShowInfo(findObj)

      view.createTextDecoration(info, editor, line - 1)
    }
  }

  private getShowInfo(findObj: LineInfo): string {
    let info = ''
    // 当前不是未提交更改
    if (!validUncommittedHash(findObj.hash)) {
      info = this.handleShowInfo(findObj)
    } else {
      info = onlyShowUncommittedInfo ? showUncommittedInfo : this.handleShowInfo(findObj)
    }
    return info
  }

  private handleShowInfo(findObj: LineInfo) {
    return showInfo.replace(/\$\{(.*?)\}/g, (_, key) => {
      if (findObj) {
        return this.organizeInformation(findObj, key?.trim() ?? key)
      }
      return ''
    })
  }

  private organizeInformation(findObj: LineInfo, token: string): string {
    let key = token.split('|')[0].trim()
    let length = token.split('|')?.[1]?.trim?.() ?? undefined

    let keys = Object.keys(this.commitInfo())
    if (!keys.includes(key)) {
      return ''
    }
    if (['committer', 'author'].includes(key)) {
      if (findObj?.[key] === userInfo.name && findObj?.[key + '-mail'] === userInfo.email) {
        return 'You'
      } else {
        return length ? findObj?.[key]?.slice(0, parseInt(length)) ?? '' : findObj?.[key] ?? ''
      }
    }
    if (key.includes('-time')) {
      return formatDate(
        new Date(),
        findObj ? new Date(parseInt(findObj[key]) * 1000) : new Date(),
        useCustomaryWording
      )
    }
    return length ? findObj?.[key]?.slice(0, parseInt(length)) ?? '' : findObj?.[key] ?? ''
  }

  public clearCache(reBlame?: boolean) {
    this.lineBlame = new Map<string, LineInfo>()
    this.fileBlame = new Map<string, Map<string, LineInfo>>()

    let editor = getActiveEditor()
    if (reBlame && editor) {
      this.handlerFile(editor.document.fileName)
    }
  }

  public dispose(): void {
    File.instance = undefined
    this.clearCache()
    this.disposeable.dispose()
  }
}

const delayFn = debounce((editor: TextEditor) => {
  File.getInstance().isEdit = false
  File.getInstance().handlerFile(editor.document.fileName, false)
  // 1000 毫秒以上拿到的数据才是新的
}, 1100)
