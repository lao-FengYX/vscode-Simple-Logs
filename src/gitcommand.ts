import { extensions } from 'vscode'
import { execCommand } from './command'
import { dirname } from 'path'
import { getActiveEditor } from './utils'

/**
 * 获取Git路径
 * @returns Git路径 或 git指令
 */
export const getGitCommand = (): string => {
  const vscodeGit = extensions.getExtension('vscode.git')
  if (vscodeGit?.exports.enabled) {
    return vscodeGit?.exports.getAPI(1).git.path
  }
  return 'git'
}

/**
 * 执行Git命令
 * @param cwd 当前工作目录
 * @param args 命令参数
 * @returns 执行结果
 */
export const run = (cwd: string, ...args: string[]): Promise<string> =>
  execCommand(getGitCommand(), args, { cwd: dirname(cwd) })

/**
 * 获取Git仓库目录
 * @param filePath 文件路径
 * @returns Git仓库目录
 */
export const getGitFolder = async (filePath: string): Promise<string> =>
  run(filePath, 'rev-parse', '--absolute-git-dir')

/**
 * 获取文件责备信息
 * @param filePath 路径
 * @returns 获得的结果
 */
export const getBlame = async (filePath: string) => {
  const args = ['blame', '-C', '--incremental', '--', filePath]
  const res = await run(filePath, ...args)
  return res
    .trim()
    .split('\n')
    .map(i => {
      let index = i.indexOf(' ')
      if (index !== -1) {
        return [i.slice(0, index), i.slice(index + 1)]
      }
      return [i, '']
    })
}

/**
 * 获取文件相对路径
 * @returns 文件相对路径
 */
export const getRelativeGitPath = async (): Promise<string> => {
  let editor = getActiveEditor()
  if (!editor) {
    return ''
  }
  const { fileName } = editor.document
  return await run(fileName, 'ls-files', '--full-name', '--', fileName)
}

/** 获取相对路径 */
export const getRelativePath = (filePath: string, parentPath: string) => {
  return filePath.replace(parentPath, '.')
}

/**
 * 验证是否是未提交的哈希值
 * @param hash 哈希值
 * @returns 验证结果
 */
export const validUncommittedHash = (hash: string): boolean => {
  return /^0{40}$/.test(hash)
}

/**
 * 验证是否是hash值
 * @param hash hash值
 * @returns
 */
export const validHash = (hash: string): boolean => {
  return /\w{40}/.test(hash)
}

/**
 * 验证是否是 原始行号 当前行号 影响的行数 组成
 * @param str 待验证的字符串
 * @returns 验证结果
 */
export const validLine = (str: string): boolean => {
  return /^\d+ \d+ \d+$/.test(str)
}
