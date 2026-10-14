/**
 * 首屏主题引导脚本（在样式表之前以阻塞方式执行）。
 *
 * 目的：避免「先渲染深色再闪成浅色」。本文件放在 public 目录，
 * 不参与打包，由 index.html 直接引用，因此必须是纯 ES5 兼容写法。
 *
 * 逻辑与 src/theme/theme.ts 保持一致；
 * 存储键：ashare-insight:theme，取值：'light' | 'dark' | 'system'。
 */
;(function () {
  try {
    var stored = window.localStorage.getItem('ashare-insight:theme')
    var theme
    if (stored === 'light' || stored === 'dark') {
      theme = stored
    } else if (stored === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      theme = 'dark'
    }
    document.documentElement.setAttribute('data-theme', theme)
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()
