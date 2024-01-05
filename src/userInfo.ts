import { exec } from 'child_process'

export type UserInfo = {
  name: string
  email: string
}

enum GITUSERINFO {
  NAME = 'git config user.name',
  EMAIL = 'git config user.email'
}

export const getUserInfo = (): Promise<UserInfo> => {
  return new Promise((resolve, reject) => {
    exec(`${GITUSERINFO.NAME} && ${GITUSERINFO.EMAIL}`, (err, stdout, stderr) => {
      if (stdout) {
        let [name, email] = stdout.trim().split('\n')
        resolve({ name, email})
      }
      reject(err || stderr)
    })
  })
}
