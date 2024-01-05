import { execFile, ExecFileOptions } from 'child_process'

import { Logger } from './logger'

/**
 * 执行命令并返回结果
 * @param command - 要执行的命令
 * @param args - 命令的参数
 * @param options - 执行命令的选项
 * @returns 返回命令执行结果
 */
export const execCommand = async (
  command: string,
  args: string[],
  options: ExecFileOptions = {}
): Promise<string> => {
  Logger.info(`${command} ${args.join(' ')}`)
  return new Promise(resolve => {
    execFile(command, args, { ...options, encoding: 'utf-8' }, (err, stdout, stderr) => {
      if (err || stderr) {
        Logger.error(err || stderr)
        resolve('')
      } else {
        resolve(stdout.trim())
      }
    })
  })
}
