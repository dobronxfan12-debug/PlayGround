// Inline SVG icon set — all hand-drawn, no external assets.
const wrap = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`

export const ICONS = {
  drop: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2S5.2 9.2 5.2 14.1a6.8 6.8 0 0 0 13.6 0C18.8 9.2 12 2.2 12 2.2Z"/><path d="M9 14.5c0 1.9 1.3 3.3 3 3.6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  jar: wrap(
    `<path d="M8 3.5h8"/><path d="M9.2 3.5v2.1c0 .5-.2 1-.6 1.4C7.5 8.3 7 9.5 7 10.7v8.1A1.7 1.7 0 0 0 8.7 20.5h6.6a1.7 1.7 0 0 0 1.7-1.7v-8.1c0-1.2-.5-2.4-1.6-3.7-.4-.4-.6-.9-.6-1.4V3.5"/><path d="M7.2 14.2h9.6" opacity=".55"/>`,
  ),
  bee: `<svg viewBox="0 0 24 24" fill="none"><ellipse cx="10" cy="15" rx="3.1" ry="2.3" fill="currentColor" opacity=".22"/><path d="M9 9.2c1.8 0 4.6 1.5 4.6 4.5s-2.8 4.5-4.6 4.5-4.6-1.5-4.6-4.5 2.8-4.5 4.6-4.5Z" fill="currentColor"/><path d="M4.4 10.7c-1.6-1.3-3.1-.2-2.4 1.4.5 1.2 1.8 1.9 2.9 1.7M13.6 10.7c1.6-1.3 3.1-.2 2.4 1.4-.5 1.2-1.8 1.9-2.9 1.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6.2 12.4h5.6M6.3 14.7h5.4" stroke="rgba(255,255,255,.65)" stroke-width="1.3"/><circle cx="3.2" cy="9.4" r="2" fill="currentColor" opacity=".16"/><circle cx="14.8" cy="9.4" r="2" fill="currentColor" opacity=".16"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8.2" fill="currentColor" opacity=".18"/><circle cx="12" cy="12" r="8.2"/><path d="M14.7 9.1c-.6-.7-1.6-1.1-2.7-1.1-1.7 0-2.6.9-2.6 2 0 2.9 5.5 1.3 5.5 4.2 0 1.2-1 2.1-2.9 2.1-1.2 0-2.3-.5-3-1.2M12 6.5v11" stroke-linecap="round"/></svg>`,
  bolt: wrap(`<path d="M13.2 2.5 4.8 13.2h5.7l-.9 8.3 8.6-10.9h-5.8l.8-8.1Z" fill="currentColor" opacity=".18"/><path d="M13.2 2.5 4.8 13.2h5.7l-.9 8.3 8.6-10.9h-5.8l.8-8.1Z"/>`),
  hive: wrap(
    `<path d="M5 20.4h14"/><path d="M6.2 20.4c-1.6-1.9-2.4-4.2-2.2-6.6.3-3.9 3.4-6.3 8-6.3s7.7 2.4 8 6.3c.2 2.4-.6 4.7-2.2 6.6"/><path d="M8 13.3h8M8.7 9.7h6.6M9.5 6.1h5"/><ellipse cx="12" cy="17.2" rx="1.6" ry="1.2" fill="currentColor" stroke="none"/>`,
  ),
  flower: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="9.4" r="2" fill="currentColor" opacity=".4"/><circle cx="12" cy="4.9" r="2.6" fill="currentColor" opacity=".16"/><circle cx="16.1" cy="7.5" r="2.6" fill="currentColor" opacity=".16"/><circle cx="14.6" cy="12.3" r="2.6" fill="currentColor" opacity=".16"/><circle cx="9.4" cy="12.3" r="2.6" fill="currentColor" opacity=".16"/><circle cx="7.9" cy="7.5" r="2.6" fill="currentColor" opacity=".16"/><path d="M12 14v6.5M12 18.2c-1.9 0-3-1-3.2-2.5 1.9-.3 3 .7 3.2 2.5ZM12 16.7c1.6-.2 2.6-1.1 2.7-2.5-1.6-.2-2.6.7-2.7 2.5Z"/></svg>`,
  cactus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 20V6.5a2 2 0 0 1 4 0v2.7c0 1.4.9 2.1 2 2.1s2-.7 2-2V7.4"/><path d="M12 14.2c-1.1 0-2-.9-2-2v-1c0-1.1-.9-2-2-2H6.7"/><path d="M8 20h8"/><path d="M12 3.8v-.1" stroke-width="3"/></svg>`,
  crystal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.5 6.3 5.2L15.6 21 12 22.2 8.4 21 5.7 7.7 12 2.5Z" fill="currentColor" opacity=".16"/><path d="m12 2.5 6.3 5.2L15.6 21 12 22.2 8.4 21 5.7 7.7 12 2.5Z"/><path d="M5.7 7.7 12 10l6.3-2.3M12 10v12.2"/></svg>`,
  snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 2.5v19M4.2 7.2l15.6 9.6M19.8 7.2 4.2 16.8"/><path d="m9.4 4.7 2.6 2.5 2.6-2.5M9.4 19.3l2.6-2.5 2.6 2.5M4.9 10.9l3.4-.7-.7-3.4M19.1 13.1l-3.4.7.7 3.4M19.1 10.9l-3.4-.7.7-3.4M4.9 13.1l3.4.7-.7 3.4"/></svg>`,
  crown: wrap(`<path d="m3.4 7.5 4.3 3.2L12 5l4.3 5.7 4.3-3.2-1.5 9.3H4.9L3.4 7.5Z" fill="currentColor" opacity=".22"/><path d="m3.4 7.5 4.3 3.2L12 5l4.3 5.7 4.3-3.2-1.5 9.3H4.9L3.4 7.5Z"/><path d="M5 20h14"/>`),
  compass: wrap(`<circle cx="12" cy="12" r="8.7"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill="currentColor" opacity=".3"/>`),
  tree: wrap(`<path d="M12 21v-6"/><path d="M12 3.2c-3.3 0-5.6 2.2-5.6 5 0 1.4.5 2.4 1.3 3.2-.5.5-.8 1.2-.8 2 0 2 1.6 3.4 3.6 3.4h3c2 0 3.6-1.4 3.6-3.4 0-.8-.3-1.5-.8-2 .8-.8 1.3-1.8 1.3-3.2 0-2.8-2.3-5-5.6-5Z" fill="currentColor" opacity=".18"/><path d="M12 3.2c-3.3 0-5.6 2.2-5.6 5 0 1.4.5 2.4 1.3 3.2-.5.5-.8 1.2-.8 2 0 2 1.6 3.4 3.6 3.4h3c2 0 3.6-1.4 3.6-3.4 0-.8-.3-1.5-.8-2 .8-.8 1.3-1.8 1.3-3.2 0-2.8-2.3-5-5.6-5Z"/>`),
  sound: wrap(`<path d="M4 9.5h3.4L12 5.6v12.8L7.4 14.5H4V9.5Z" fill="currentColor" opacity=".22"/><path d="M4 9.5h3.4L12 5.6v12.8L7.4 14.5H4V9.5Z"/><path d="M15.5 8.3a5.2 5.2 0 0 1 0 7.4M18 5.8a8.8 8.8 0 0 1 0 12.4"/>`),
  mute: wrap(`<path d="M4 9.5h3.4L12 5.6v12.8L7.4 14.5H4V9.5Z" fill="currentColor" opacity=".22"/><path d="M4 9.5h3.4L12 5.6v12.8L7.4 14.5H4V9.5Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>`),
  close: wrap(`<path d="m6 6 12 12M18 6 6 18"/>`),
  lock: wrap(`<rect x="4.8" y="10.2" width="14.4" height="10.3" rx="2.4" fill="currentColor" opacity=".16"/><rect x="4.8" y="10.2" width="14.4" height="10.3" rx="2.4"/><path d="M8.2 10.2V7.6a3.8 3.8 0 0 1 7.6 0v2.6"/>`),
  check: wrap(`<path d="m5 12.5 4.5 4.5L19 6.8"/>`),
  arrow: wrap(`<path d="M4.5 12h15M14 6.5l5.5 5.5L14 17.5"/>`),
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z"/></svg>`,
  help: wrap(`<circle cx="12" cy="12" r="8.8"/><path d="M9.4 9.2A2.7 2.7 0 0 1 12 6.7c1.5 0 2.7 1 2.7 2.4 0 2-2.7 2-2.7 4.1"/><circle cx="12" cy="17.1" r=".9" fill="currentColor" stroke="none"/>`),
  shop: wrap(`<path d="M4.5 9.4 6 4.5h12l1.5 4.9"/><path d="M4.2 9.4h15.6v9.1a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2V9.4Z"/><path d="M9.2 20.5v-5.6h5.6v5.6"/>`),
  sparkle: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.8 5.7L19.5 9.5l-5.7 1.8L12 17l-1.8-5.7L4.5 9.5l5.7-1.8L12 2Z"/><path d="m19 15 .9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15Z" opacity=".6"/></svg>`,
}

export function beePortrait(type, locked = false) {
  const id = `beeclip-${type.id}`
  return `<span class="bee-portrait${locked ? ' is-locked' : ''}" style="--bee:${type.body};--stripe:${type.stripe};--accent:${type.accent}">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs><clipPath id="${id}"><ellipse cx="31" cy="36" rx="18" ry="12.5"/></clipPath></defs>
      <ellipse cx="21" cy="22" rx="12" ry="6" fill="rgba(255,255,255,.72)" transform="rotate(-26 21 22)"/>
      <ellipse cx="42" cy="21" rx="11" ry="5.5" fill="rgba(255,255,255,.6)" transform="rotate(24 42 21)"/>
      <ellipse cx="31" cy="37" rx="18" ry="12.5" fill="var(--bee)" stroke="rgba(50,29,10,.5)" stroke-width="1.5"/>
      <g clip-path="url(#${id})">
        <rect x="18" y="20" width="5.5" height="35" fill="var(--stripe)" transform="rotate(8 21 37)"/>
        <rect x="32" y="20" width="5.5" height="35" fill="var(--stripe)" transform="rotate(8 35 37)"/>
      </g>
      <circle cx="48" cy="34" r="8" fill="#2a1a0e"/>
      <circle cx="50.5" cy="32" r="1.6" fill="#fff"/>
      <circle cx="51" cy="32" r=".8" fill="#2a1a0e"/>
      <path d="M52 27c3-2 5-2 6-4M52 29c3-1 5 0 7-1" stroke="#2a1a0e" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="m13 37-5 2 5 2" fill="var(--accent)" opacity=".9"/>
      <circle cx="22" cy="45" r="2.6" fill="var(--accent)" opacity=".85"/>
      <circle cx="40" cy="46" r="2.2" fill="var(--accent)" opacity=".7"/>
    </svg>
  </span>`
}
