/** 字体大小调节：小 / 中 / 大 三段按钮，点一下即生效。 */

import { useTheme } from '../theme/ThemeProvider'
import { FONT_LABEL, FONT_SIZES } from '../theme/font'

export function FontScaleToggle() {
  const { fontSize, setFontSize } = useTheme()

  return (
    <div className="font-scale" role="group" aria-label="字体大小">
      <span className="font-scale-label">字体</span>
      {FONT_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          className={`font-btn ${fontSize === size ? 'active' : ''}`}
          aria-pressed={fontSize === size}
          title={`字体${FONT_LABEL[size]}`}
          onClick={() => setFontSize(size)}
        >
          {FONT_LABEL[size]}
        </button>
      ))}
    </div>
  )
}
