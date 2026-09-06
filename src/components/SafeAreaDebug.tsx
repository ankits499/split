import { useEffect, useState } from 'react'

// Temporary diagnostic overlay — reads the actual on-device safe-area
// insets and rendered header/nav offsets so we can fix the padding from
// real numbers instead of guessing. Remove once the padding is confirmed
// correct on-device.
export function SafeAreaDebug() {
  const [info, setInfo] = useState<string>('measuring…')

  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
    document.body.appendChild(probe)
    const cs = getComputedStyle(probe)
    const insetTop = cs.paddingTop
    const insetBottom = cs.paddingBottom
    probe.remove()

    const root = document.getElementById('root')
    const rootTop = root?.getBoundingClientRect().top ?? -1
    const header = document.querySelector('h1')
    const headerTop = header?.getBoundingClientRect().top ?? -1
    const nav = document.querySelector('nav')
    const navRect = nav?.getBoundingClientRect()
    const standalone = window.matchMedia('(display-mode: standalone)').matches

    setInfo(
      [
        `standalone: ${standalone}`,
        `innerHeight: ${window.innerHeight}`,
        `env(top): ${insetTop} · env(bottom): ${insetBottom}`,
        `#root top: ${rootTop.toFixed(1)}`,
        `h1 top: ${headerTop.toFixed(1)}`,
        `nav top/bottom: ${navRect?.top.toFixed(1)} / ${navRect?.bottom.toFixed(1)} (viewport h ${window.innerHeight})`,
      ].join('\n')
    )
  }, [])

  return (
    <pre
      style={{
        position: 'fixed',
        top: 4,
        left: 4,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        color: '#0f0',
        fontSize: 10,
        lineHeight: 1.4,
        padding: '6px 8px',
        borderRadius: 6,
        whiteSpace: 'pre-wrap',
        pointerEvents: 'none',
      }}
    >
      {info}
    </pre>
  )
}
