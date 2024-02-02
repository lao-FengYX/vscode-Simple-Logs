import { window, workspace, TextEditor } from 'vscode'

/** 获取激活的编辑器 */
export const getActiveEditor = (): TextEditor | undefined => window.activeTextEditor

/** 验证文件 */
export const validScheme = (editor: TextEditor): boolean => editor.document.uri.scheme === 'file'

type Config = {
  fontColor: string
  backgroundColor: string
  excludePath: string
  useCustomaryWording: boolean
  showInfo: string
  showUncommittedInfo: string
  onlyShowUncommittedInfo: boolean
}

/** 获取配置 */
export const getConfig = <T extends keyof Config>(key: T): Config[T] =>
  workspace.getConfiguration('simple-logs').get(key) as Config[T]

/** 验证路径一致 */
export const validParentPathStart = (parentPath: string, filename: string): boolean =>
  filename.startsWith(parentPath)

/** 防抖函数 */
export const debounce = (fn: (...args: any[]) => any, delay: number) => {
  let timer: NodeJS.Timeout | null = null
  return function (this: any, ...params: any[]) {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn.apply(this, params)
    }, delay)
  }
}
