// Feel - 画面の飾り用アイコン(色は、まわりの文字の色になる)。すべて自前の簡単な図形。
const base = { width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true, focusable: false }

export const IconPlay = (p) => <svg {...base} {...p}><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm5 4v10l8-5z" fillRule="evenodd" /></svg>
export const IconCareer = (p) => <svg {...base} {...p}><path d="M3 20h18v2H3zM5 11h3v8H5zm5-5h3v13h-3zm5 3h3v10h-3z" /></svg>
export const IconCollection = (p) => <svg {...base} {...p}><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0z" /></svg>
export const IconAgents = (p) => <svg {...base} {...p}><circle cx="12" cy="7.5" r="4.2" /><path d="M3 21c0-5 3.6-8 9-8s9 3 9 8z" /></svg>
export const IconParty = (p) => <svg {...base} {...p}><circle cx="12" cy="7" r="3.4" /><circle cx="5" cy="9.5" r="2.6" /><circle cx="19" cy="9.5" r="2.6" /><path d="M6.5 20c0-4 2.4-6.4 5.5-6.4s5.5 2.4 5.5 6.4zM0.5 19c0-3.2 1.7-5 4.5-5 .8 0 1.5.1 2.1.4-1.3 1.3-2 3-2.2 4.6zM23.5 19c0-3.2-1.7-5-4.5-5-.8 0-1.5.1-2.1.4 1.3 1.3 2 3 2.2 4.6z" /></svg>
export const IconStore = (p) => <svg {...base} {...p}><path d="M2 3h3l.7 3H22l-2.2 9H8.4l.4 2H20v2H7.2L4 5H2zM9 20.5a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0zm7 0a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0z" /></svg>
export const IconLock = (p) => <svg {...base} {...p}><path d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10zm2 0h6V8a3 3 0 0 0-6 0z" /></svg>
export const IconRules = (p) => <svg {...base} {...p}><path d="M5 2h11l4 4v16H5zm10 1.5V7h3.5zM8 11h9v1.8H8zm0 4h9v1.8H8z" fillRule="evenodd" /></svg>
export const IconGem = (p) => <svg {...base} {...p}><path d="M12 2l9 7-9 13L3 9z" /></svg>
// 閉じるボタンの × (まん中に点のある円)
export const IconClose = (p) => <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></svg>
export const IconEvent = (p) => <svg {...base} {...p}><path d="M12 1.5l2.6 6.2 6.7.5-5.1 4.4 1.6 6.5L12 15.7l-5.8 3.4 1.6-6.5L2.7 8.2l6.7-.5z" /><path d="M4 21h16v1.6H4z" /></svg>
export const IconGacha = (p) => <svg {...base} {...p}><path d="M13.5 1.5l9 9-4.2 4.2-9-9zM9.4 7.6l7 7-8.3 8.3a2.4 2.4 0 0 1-3.4 0l-3.6-3.6a2.4 2.4 0 0 1 0-3.4z" /><circle cx="13.5" cy="10.5" r="1.6" fill="#000" opacity="0.35" /></svg>
export const IconGear = (p) => <svg {...base} {...p}><path d="M10.3 2h3.4l.6 2.7 1.7.7 2.3-1.5 2.4 2.4-1.5 2.3.7 1.7 2.7.6v3.4l-2.7.6-.7 1.7 1.5 2.3-2.4 2.4-2.3-1.5-1.7.7-.6 2.7h-3.4l-.6-2.7-1.7-.7-2.3 1.5-2.4-2.4 1.5-2.3-.7-1.7L2 13.7v-3.4l2.7-.6.7-1.7-1.5-2.3 2.4-2.4 2.3 1.5 1.7-.7zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" fillRule="evenodd" /></svg>
export const IconMail = (p) => <svg {...base} {...p}><path d="M2 5h20v2.2l-10 6.3L2 7.2zM2 9.7l10 6.3 10-6.3V19H2z" /></svg>
export const IconPower = (p) => <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M12 3v9M6.3 6.8a8 8 0 1 0 11.4 0" /></svg>
export const IconPlus = (p) => <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>
