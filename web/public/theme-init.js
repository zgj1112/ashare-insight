/**
 * 首屏显示偏好引导脚本（在样式表之前以阻塞方式执行）。
 *
 * 目的：避免「先渲染深色再闪成浅色」以及字体档位跳变。
 * 本文件放在 public 目录，不参与打包，由 index.html 直接引用，
 * 因此必须是纯 ES5 兼容写法。
 *
 * 读取的键与 src/theme/theme.ts、src/theme/font.ts 保持一致：
 *   ashare-insight:theme       'light' | 'dark' | 'system'（缺省 dark）
 *   ashare-insight:font        'small' | 'medium' | 'large'（缺省 medium）
 */
;(function () {
  var root = document.documentElement

  // 主题
  var theme = 'dark'
  try {
    var storedTheme = window.localStorage.getItem('ashare-insight:theme')
    if (storedTheme === 'light' || storedTheme === 'dark') {
      theme = storedTheme
    } else if (storedTheme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  } catch (error) {
    theme = 'dark'
  }
  root.setAttribute('data-theme', theme)

  // 字体档位
  var font = 'medium'
  try {
    var storedFont = window.localStorage.getItem('ashare-insight:font')
    if (storedFont === 'small' || storedFont === 'medium' || storedFont === 'large') {
      font = storedFont
    }
  } catch (error) {
    font = 'medium'
  }
  root.setAttribute('data-font', font)
})()
