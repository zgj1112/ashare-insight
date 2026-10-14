/**
 * 开发环境预加载钩子（可选）。
 *
 * 受限沙箱下 Node 无法为「被捕获输出」的子进程建立管道（spawn EPERM）。
 * Vite 启动时会用 child_process.exec 探测盘符是否为网络磁盘（`net use`），
 * 在本地磁盘场景下该探测没有实际意义，因此这里替换为固定结果，
 * 避免开发服务器因管道限制无法启动。
 *
 * 用法：pnpm/npm run dev:sandbox
 * 若无需该绕过，直接 npm run dev 即可。
 */

import { syncBuiltinESMExports } from 'node:module'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const childProcess = require('node:child_process')

const originalExec = childProcess.exec.bind(childProcess)
const originalExecFile = childProcess.execFile.bind(childProcess)
const originalExecSync = childProcess.execSync.bind(childProcess)

/** 只拦截「磁盘类型探测」这类只读查询，其余命令照常执行。 */
const PROBE_PATTERN = /^\s*(net\s+use|wmic|fsutil|powershell.*Get-Volume)/i

function respond(callback) {
  // 第二个回调参数必须是字符串：Vite 会直接对它调用 stdout.split()
  if (typeof callback === 'function') {
    callback(null, 'The type of the file system is NTFS.\n', '')
  }
  return { on() {}, once() {}, kill() {}, stdout: null, stderr: null, pid: -1 }
}

childProcess.exec = function exec(command, options, callback) {
  if (typeof options === 'function') callback = options
  if (typeof command === 'string' && PROBE_PATTERN.test(command)) return respond(callback)
  return originalExec(command, options, callback)
}

childProcess.execFile = function execFile(file, args, options, callback) {
  if (typeof args === 'function') callback = args
  else if (typeof options === 'function') callback = options
  const flat = Array.isArray(args) ? args.join(' ') : ''
  if (typeof file === 'string' && PROBE_PATTERN.test(`${file} ${flat}`)) return respond(callback)
  return originalExecFile(file, args, options, callback)
}

childProcess.execSync = function execSync(command, options) {
  if (typeof command === 'string' && PROBE_PATTERN.test(command)) {
    return 'The type of the file system is NTFS.\n'
  }
  return originalExecSync(command, options)
}

syncBuiltinESMExports()
