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

export const lineBlame = new Map<string, LineInfo>()
export const fileBlame = new Map<string, Map<string, LineInfo>>()
export let dispose: Disposable

let view = new View()
let excludePath = getConfig('excludePath').split(',')

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

export const handlerFile = async (filePath: string, removeDecoration = true): Promise<void> => {
  let editor = getActiveEditor()
  if (!editor) return

  let parentPath = workspace.workspaceFolders?.[0].uri.fsPath || ''
  if (!validParentPathStart(parentPath, filePath)) return

  if (excludePath.some(i => filePath.includes(i))) return

  let gitPath = getGitFolder(filePath)
  if (!gitPath) return

  if (!userInfo) {
    userInfo = await getUserInfo()
  }

  const arr = await getBlame(filePath)
  let obj = chunkArr(arr)

  if (!Reflect.ownKeys(obj).length) {
    Logger.info('No information for current file')
    return
  }

  blameProcess(obj)

  const path = getRelativePath(filePath, parentPath)
  fileBlame.set(path, lineBlame)

  selectChange(path, removeDecoration)
}

const commitInfo = (): LineInfo => ({
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

const createLineObj = (): Line => ({
  'source': '',
  'result': '',
  'count': ''
})

const chunkArr = (arr: string[][]) => {
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

const blameProcess = (obj: { [key: string]: string[][] }): void => {
  for (const key in obj) {
    let arr = obj[key]
    let temp: LineInfo = commitInfo()
    let lineObj = createLineObj()
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
        } else if (name.includes('time')) {
          temp[name] = formatDate(new Date(), new Date(parseInt(val) * 1000))
        } else {
          temp[name] = val
        }
      }
    }

    loopSetLineBlame(lineObj, temp)
  }
}

const loopSetLineBlame = (line: Line, temp: LineInfo): void => {
  for (let i = 0; i < parseInt(line.count); i++) {
    if (validUncommittedHash(temp.hash)) {
      temp.author = temp.committer = userInfo.name
      temp['author-mail'] = temp['committer-mail'] = userInfo.email
      temp.summary = 'Uncommitted changes'
    }
    lineBlame.set(parseInt(line.result) + i + '', temp)
  }
}

const selectChange = (path: string, removeDecoration = true): void => {
  let editor = getActiveEditor()
  if (!editor) return
  let map = fileBlame.get(path)
  if (!map) return

  removeDecoration ? view.removeDclearecoration() : null

  let line = editor.selection.active.line + 1
  if (line >= editor.document.lineCount) {
    return
  }

  let findObj = map?.get(line + '')
  if (findObj) {
    view.createTextDecoration(
      `${
        findObj.committer === userInfo.name && findObj['committer-mail'] === userInfo.email
          ? 'You'
          : findObj.committer
      }, ${findObj['committer-time']} • ${findObj.summary}`,
      editor,
      line - 1
    )
  }
}

const delayFn = debounce((editor: TextEditor) => {
  handlerFile(editor.document.fileName, false)
  isEdit = false
}, 300)

let isEdit = false

dispose = Disposable.from(
  view,
  workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('simple-logs')) {
      excludePath = getConfig('excludePath').split(',')
    }
  }),
  window.onDidChangeActiveTextEditor(e => {
    if (e) {
      handlerFile(e.document.fileName)
    }
  }),
  window.onDidChangeTextEditorSelection(({ textEditor }) => {
    const { scheme } = textEditor.document.uri
    if (scheme === 'file' || scheme === 'untitled') {
      let parentPath = workspace.workspaceFolders?.[0].uri.fsPath || ''
      const path = getRelativePath(textEditor.document.fileName, parentPath)
      if (!isEdit) selectChange(path)
    }
  }),
  // workspace.onDidSaveTextDocument(() => {
  //   let editor = getActiveEditor()
  //   if (!editor || isEdit) return
  //   handlerFile(editor.document.fileName)
  // }),
  workspace.onDidCloseTextDocument(async document => {
    if (document.uri.fsPath.endsWith('.git')) {
      return
    }

    let dir = workspace.workspaceFolders?.[0].uri.fsPath || ''
    const path = getRelativePath(document.fileName, dir)
    fileBlame.delete(path)
  }),
  workspace.onDidChangeTextDocument(({ contentChanges, document }) => {
    let editor = getActiveEditor()
    if (!editor) return
    if (contentChanges.length) {
      if (editor?.document === document) {
        isEdit = true
        view.removeDclearecoration()
        delayFn(editor)
      }
    }
  })
)
