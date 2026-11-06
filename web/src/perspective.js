// 画面の「自分」はどちらのチームか。CPU戦では、いつも A(自分)。対人戦では、部屋に入った順で A か B。
// 画面の部品が、自分と相手の色・呼び名・左右を決めるときに読む(BattleScreen が、描く前に setMe で決める)。
export let ME = 'A'
export const setMe = (side) => { ME = side === 'B' ? 'B' : 'A' }
export const OPP = () => (ME === 'A' ? 'B' : 'A')
// 勝者を「自分から見た」A/B/draw に直す(勝敗の表示用: 自分の勝ちなら A)
export const winnerView = (w) => (w === 'A' || w === 'B' ? (w === ME ? 'A' : 'B') : w)
