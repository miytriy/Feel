import { useId } from 'react'
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
export const IconBack = (p) => <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 12H5M11 5l-7 7 7 7" /></svg>
export const IconSearch = (p) => <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
export const IconFolder = (p) => <svg {...base} {...p}><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4H9l2 2.5h9.5A1.5 1.5 0 0 1 22 8v10.5a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5z" /></svg>

// ---------- ステータスの記号(HP・攻撃力・防御力・会心 など) ----------
const starPts = (n, ro, ri, rot = -90) => Array.from({ length: n * 2 }, (_, i) => {
  const a = ((rot + (i * 180) / n) * Math.PI) / 180
  const r = i % 2 === 0 ? ro : ri
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`
}).join(' ')
const STAR8 = starPts(4, 11, 4.2, -90)
const STAR16 = starPts(8, 11, 6.2, -90)

const DIAMOND = 'M247 145L322 220L314 228L247 161L185 222L247 284L276 255L284 263L247 300L171 222Z'
const MagIcon = (p) => {
  const id = `mg${useId().replace(/:/g, '')}`
  return (
    <svg {...base} viewBox="0 0 468 494" {...p}>
      <mask id={id}><rect width="468" height="494" fill="#fff" /><path d={DIAMOND} fill="#000" fillRule="evenodd" /></mask>
      <g fill="currentColor" mask={`url(#${id})`}>
        <path d="M39 141L58 141V355L190 388L39 422Z" />
        <path d="M441 141H458V422L308 388L441 355Z" />
        <path d="M84 57L247 94L413 57V341L247 375L84 341Z" />
        <path d="M185 387L206 392L227 387V449L206 444L185 449Z" />
      </g>
    </svg>
  )
}

export const StatIcon = ({ stat, ...p }) => {
  switch (stat) {
    case 'hp':
      return <svg {...base} viewBox="0 0 130 130" {...p}><path d="M49 9H83L84 47L85 48H120L123 83L122 85H85L84 86V95L83 96V124H47V86L46 85H8V49H39L47 47V10Z M46 48L49 49L84 85L83 86H47L46 85Z" fillRule="evenodd" /></svg>
    case 'atk':
      return <svg {...base} viewBox="0 0 140 140" {...p}><path d="M13 17H32L69 53L102 23L108 17H127V37L91 73V76L109 93V95L89 113L72 95H69L51 113L32 95V93L50 75V74L15 39L13 36Z M33 105L39 111L24 129L15 130L14 122L28 109Z M108 105L126 122L126 124L120 130L118 130L101 113Z" /></svg>
    case 'def':
      return <svg {...base} viewBox="0 0 120 140" {...p}><path d="M17 14H96V97L72 117L57 131L52 128L43 120L42 118L17 97Z M26 39L29 38L85 95L84 97H28L26 94Z" fillRule="evenodd" /></svg>
    case 'critRate':
      return <svg {...base} viewBox="0 0 150 155" {...p}><path d="M107 11L75 42H35L34 43H13L42 73L43 75V139L61 122L73 109L75 108H91L92 107H138L107 75L138 43H115V63L114 66L107 75Z M43 11V34H68L50 17Z M36 83L12 107H36Z M84 114L107 139V114Z" /></svg>
    case 'critDmg':
      return <svg {...base} viewBox="0 0 150 150" {...p}><path d="M43 17L71 44V76H41L12 48H42L43 47Z M107 17V47L108 48H138L112 75L109 76H80V43Z M71 84V115L44 143H43V113L13 113L30 94L39 85H48Z M80 84H106L107 85L112 85L139 112H108L107 113V143L105 142L80 117Z" /></svg>
    case 'spd': // 進む山形
      return <svg {...base} {...p}><path d="M3 4l8 8-8 8V4zM12 4l8 8-8 8z" /></svg>
    case 'mag': // 魔力(開いた本。まん中のひし形は、くりぬき)
      return <MagIcon {...p} />
    case 'dmgResist': // 盾(まん中に縦線)
      return <svg {...base} {...p}><path d="M4.5 2.5h15v11l-7.5 8-7.5-8zM11 6v11h2V6z" fillRule="evenodd" /></svg>
    default:
      return <svg {...base} {...p}><circle cx="12" cy="12" r="5" /></svg>
  }
}
