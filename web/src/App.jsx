import { useEffect, useMemo, useRef, useState } from 'react'
import RulesScreen from './RulesScreen.jsx'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase.js'
import { openLogin } from './LoginDialog.jsx'
import {
  gateStatus, gateEnter, gateCheck, gateMe, getGateToken, setGateToken, fetchMe, enhanceChar, saveKeys, exchangeTicket, exchangeCrystal, buyPass, fetchCareer, recordMatch, clearCareer, drawGacha, claimLoginBonus, startBattleTicket, finishBattle, fetchGifts, claimGift, redeemCode, markMailRead, setMailStar, deleteMail, purgeReadMail,
} from './api.js'
import BattleScreen from './BattleScreen.jsx'
import CareerScreen from './CareerScreen.jsx'
import JinjiScreen from './JinjiScreen.jsx'
import WikiScreen from './WikiScreen.jsx'
import SettingsScreen from './SettingsScreen.jsx'
import MailboxScreen from './MailboxScreen.jsx'
import GachaScreen from './GachaScreen.jsx'
import StoreScreen from './StoreScreen.jsx'
import { showRewards } from './RewardScreen.jsx'
import FormationScreen from './FormationScreen.jsx'
import NewsScreen from './NewsScreen.jsx'
import HomeScreen, { ACCOUNT_SCREENS, canOpen } from './HomeScreen.jsx'
import { unlockLevel, tryUnlock, relock } from './unlock.js'
import { createSandbox } from './sandbox.js'
import { installKeys, applyRemoteKeys, setKeysSaver, customKeys } from './keys.js'
import { loadRelics, clearRelics } from './relicInv.js'
import GuideScreen from './GuideScreen.jsx'
import CpuBattleScreen from './CpuBattleScreen.jsx'
import PvpScreen from './PvpScreen.jsx'
import RandomMatchScreen from './RandomMatchScreen.jsx'
import { loadFormation, defaultFormation, loadSpellSet } from './battle/formation.js'
import { CPU_LEVELS } from './battle/ai.js'
import { DEFAULT_PLAYER_IDS } from './battle/teams.js'
import { ScreenHeader, PillTabs, Chip, LoadingScreen } from './chrome.jsx'
import { IconGem } from './icons.jsx'
import { loadSettings, saveSettings, cpuDelayOf } from './settings.js'
import { ALL_CHARACTERS } from './battle/characters/index.js'
import { setEnhanceLevels } from './enhance.js'
import { ALL_SPELLS } from './battle/spells/index.js'
import { loadParties, saveParty, getActiveParty, setActiveParty, partyToSlots, partyToSpells, partyCount } from './battle/parties.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import GateScreen from './GateScreen.jsx'
import { useIsDesktop, useRemembered, C, FONT } from './ui.js'

const PITY_COUNT = 40
const COST = 500 // ガチャ1回の交易石(server/config.js の COST_PER_PULL と同じにする)

const RARITY = {
  legend: { label: 'レジェンド', color: '#a21caf' },
  gold: { label: 'ゴールド', color: '#a16207' },
  silver: { label: 'シルバー', color: '#5b6472' },
  bronze: { label: 'ブロンズ', color: '#b45309' },
}

// CPU戦のレベル一覧(レベルを選ぶ画面に出す)。報酬は server/config.js の BATTLE_REWARD と同じにする
const BATTLE_REWARD = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 60 }
// テスト戦(マスターパスワードを解除した人だけ): 自分も相手も、好きなチームを組んで、CPUと戦う。報酬・戦績・記録はなし
const TEST_ENTRY = {
  id: 'test', test: true, num: 1,
  name: 'テスト戦', title: 'テスト戦', area: 'CPU戦 ・ 検証用',
  desc: '自分と相手のチームを、どちらも好きに選んで対戦します。能力・演出の検証用です。',
  rule: 'マスターパスワードを解除している間だけ使えます。相手(CPU)は Lv.1(ランダムに行動)です。報酬・戦績・記録はありません。',
  rewards: [],
}
const CPU_LEVEL_LIST = CPU_LEVELS.map((l) => ({
  id: `lv${l.level}`,
  num: l.level,
  name: `Lv.${l.level}`,
  title: l.name, // 「Lv.1」など
  area: 'CPU戦 ・ 通常戦',
  desc: l.description,
  rule: '相手のキャラクターをすべて倒すと、勝ちです。勝つと、交易石がもらえます(ログイン中のみ・1日5回まで)。CPUのクラスは、毎回ランダムです。',
  rewards: [{ label: '交易石', amount: BATTLE_REWARD[l.level], type: 'gem' }],
}))

export default function App() {
  const [screen, setScreen] = useState('home')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [me, setMe] = useState(null)
  setEnhanceLevels(me && me.enh) // 署名の強化レベル(戦闘に入るとき、ステータスに反映される)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('') // 受け取りに成功したときの表示
  const [gifts, setGifts] = useState([])
  const [code, setCode] = useState('')
  const [storeTab, setStoreTab] = useRemembered('store.tab', 'bonus') // 購買部のタブ(出入りしても、最後に選んだものに戻る)
  const [stoneTab, setStoneTab] = useRemembered('store.stoneTab', 'ticket') // 石購入の中のタブ
  const [settings, setSettings] = useState(loadSettings) // 設定(この端末に保存)
  useEffect(() => { installKeys() }, [])
  // キーの割り当ては、ログイン中はアカウントに保存する(別の端末でも同じになる)。ゲストは、この端末だけ
  const keysUid = useRef(null)
  useEffect(() => {
    if (!user || !me || keysUid.current === user.uid) return
    keysUid.current = user.uid
    if (me.keys) applyRemoteKeys(me.keys) // アカウントにあれば、それを使う
    else if (Object.keys(customKeys()).length) saveKeys(customKeys()).catch(() => {}) // 初めて: この端末の割り当てを、アカウントに上げる
  }, [user, me])
  useEffect(() => {
    if (!user) { setKeysSaver(null); return undefined }
    let t = null
    setKeysSaver((keys) => { clearTimeout(t); t = setTimeout(() => saveKeys({ ...keys }).catch(() => {}), 600) })
    return () => { clearTimeout(t); setKeysSaver(null) }
  }, [user])
  const [rulesBack, setRulesBack] = useState('play') // ルールを閉じたときに戻る画面
  // PLAY → 案内所(play) → CPU戦のレベル(cpu) → チーム(team) → 読み込み(loading) → 対戦(battle)
  const [cpuLevel, setCpuLevel] = useState(2) // 選んだCPUのレベル
  const [cpuSel, setCpuSel] = useRemembered('cpu.level', 'lv2') // CPU戦で最後に選んでいた項目(レベル / テスト戦)
  const [testMine, setTestMine] = useState(null) // テスト戦: 自分のチームを決めたあと、相手のチームを選ぶ間、ここに置いておく { team, spells }
  const [cpuRun, setCpuRun] = useState(null) // 対戦の準備 { id, level, team, spells }
  const [rankRun, setRankRun] = useState(null) // ランクマッチで使うチーム { team, spells }(なければ、保存した編成)
  const [pvpRun, setPvpRun] = useState(null) // 対人戦の準備 { id, team, spells }
  const [lockedKey, setLockedKey] = useState(null) // ログインが必要な項目を、ログインなしで押したとき
  const [unlockLv, setUnlockLv] = useState(unlockLevel) // 設定でマスターパスワードを打つと、ログインが必要な機能を、ログインなしで使える(1=人事・編成・足跡 / 2=最高権限: ガチャ・メールも体験用)
  // 最高権限(レベル2)でログインしていないときだけ、ガチャとメールを、この端末の中だけの仮のデータで動かす(ページを読み込み直すと、最初から)
  const sandbox = useMemo(() => (!user && unlockLv >= 2 ? createSandbox({ characters: ALL_CHARACTERS, cost: COST }) : null), [!user && unlockLv >= 2]) // eslint-disable-line react-hooks/exhaustive-deps
  const api = sandbox || { fetchMe, enhanceChar, fetchGifts, drawGacha, claimGift, markMailRead, setMailStar, deleteMail, purgeReadMail, claimLoginBonus, redeemCode, exchangeTicket, exchangeCrystal, buyPass }
  const [parties, setParties] = useState(null) // パーティー(最大5つ。ログイン中だけ)
  const [activeIdx, setActiveIdx] = useState(null) // 最後に選んだパーティーの番号
  const desktop = useIsDesktop() // 画面の幅が広い(PC)ときは、画面全体を使うレイアウトにする
  // 開発中の入口(マスターパスワード): checking=確認中 / locked=パスワードが必要 / open=入れる / offline=サーバーにつながらない
  // 入室制限の対象になりうる訪問者(初めての人も含む)には、ロード画面を出さず、すぐ入口の画面を見せる。確認は裏で続け、入れると分かれば開く。
  // ロード画面を出すのは、前回「入れた」と分かっている端末だけ
  const [gate, setGateRaw] = useState(() => { try { return localStorage.getItem('feel.gate.state') === 'open' ? 'checking' : 'locked' } catch { return 'locked' } })
  const setGate = (v) => { setGateRaw(v); try { if (v === 'locked' || v === 'open') localStorage.setItem('feel.gate.state', v) } catch { /* 保存できない環境では、毎回入口の画面から始まる */ } }
  const [gateTry, setGateTry] = useState(0)
  const [booted, setBooted] = useState(false) // 起動の準備(ログイン確認・入口・持ち物の読み込み)が終わったか。いちど終わったら、ロード画面は出さない
  const [rulesFirst, setRulesFirst] = useState(false) // 初回だけ、ルール説明を自動で開く
  useEffect(() => {
    if (screen !== 'loading') return undefined
    const t = setTimeout(() => setScreen('battle'), 1900) // バーが100%になる(1400ms)のを見せてから、対戦へ
    return () => clearTimeout(t)
  }, [screen])

  useEffect(() => {
    if (gate !== 'open') return
    try {
      if (!localStorage.getItem('feel.rules.seen')) {
        localStorage.setItem('feel.rules.seen', '1')
        setRulesFirst(true)
        setScreen('rules')
      }
    } catch { /* 保存できない環境では出さない */ }
  }, [gate])
  const gateOpen = gate === 'open'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
      if (!u) {
        setMe(null)
        setResults(null)
      }
    })
    return () => unsubscribe()
  }, [])

  // 入口の確認: パスワード不要の設定 / すでにアカウントがある人 / 通行証を持っている人 は入れる
  useEffect(() => {
    if (authLoading) return
    let alive = true
    if (!booted && gate !== 'locked') setGate('checking') // 起動中だけ。起動後の確かめ直しは、画面を変えずに裏で行う(ロード画面を出し直さない)
    ;(async () => {
      try {
        const st = await gateStatus()
        if (!st.required) return alive && setGate('open')
        if (user) {
          const m = await gateMe()
          if (m.exempt) return alive && setGate('open')
        }
        const t = getGateToken()
        if (t && (await gateCheck(t)).ok) return alive && setGate('open')
        if (t) setGateToken('') // 古い通行証(パスワードが変わったときなど)は捨てる
        if (alive) setGate('locked')
      } catch (e) {
        console.error('入口の確認に失敗', e)
        if (alive) setGate('offline')
      }
    })()
    return () => { alive = false }
  }, [authLoading, user, gateTry])

  // パーティーは、アカウントごとに、この端末のブラウザに保存してある
  // ログインなしで解放しているときは、'guest' という名前で、この端末に保存する
  const partyUid = user ? user.uid : unlockLv >= 1 ? 'guest' : null
  useEffect(() => {
    if (!partyUid) { setParties(null); setActiveIdx(null); return }
    setParties(loadParties(partyUid))
    setActiveIdx(getActiveParty(partyUid))
  }, [partyUid])

  useEffect(() => {
    if (!user || !gateOpen) return
    setBusy(true)
    setError('')
    fetchMe()
      .then(setMe)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false))
    fetchGifts()
      .then((r) => setGifts(r.gifts))
      .catch(() => {}) // プレゼント一覧が取れなくても、他の機能は使える
    loadRelics() // 遺物の所持・装備(取れなくても、他の機能は使える)
  }, [user, gateOpen])
  useEffect(() => { if (!user) clearRelics() }, [user])

  // 起動の準備ができたら、ロード画面を閉じる(ログイン中は、持ち物の読み込みまで待つ。失敗したときも、先に進む)
  const bootReady = !authLoading && gate !== 'checking' && !(gate === 'open' && user && !me && !error)
  const bootProgress = bootReady ? 100 : authLoading ? 8 : gate === 'checking' ? 35 : 70 // ロードバーの進み(実際の準備の段階に合わせる)
  useEffect(() => {
    if (booted || !bootReady) return undefined
    const t = setTimeout(() => setBooted(true), 450) // バーが100%になるのを見せてから、ロード画面を開ける
    return () => clearTimeout(t)
  }, [booted, bootReady])

  // ログイン状態の確認が終わってから読み込む(確認の途中で、持ち物が空に戻されないように)
  useEffect(() => {
    if (!sandbox || authLoading) return undefined
    let alive = true
    sandbox.fetchMe().then((m) => { if (alive) setMe(m) })
    sandbox.fetchGifts().then((r) => { if (alive) setGifts(r.gifts) })
    return () => { alive = false }
  }, [sandbox, authLoading])
  // 体験用をやめたとき(ログインした・もとに戻した)は、仮のデータを捨てる
  useEffect(() => {
    if (!sandbox) return undefined
    return () => { setMe(null); setGifts([]) }
  }, [sandbox])

  const handleLogin = () => { setError(''); openLogin() }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const handleGacha = async (times, banner, convert = 0) => {
    setBusy(true)
    setError('')
    try {
      if (convert > 0) await api.exchangeTicket(banner === 'normal' ? 'normal' : 'limited', convert) // 足りない券は、交易石から変換する
      const data = await api.drawGacha(times, banner)
      setResults(data.pulls)
      setMe(await api.fetchMe())
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // 受け取り系の操作の共通処理(通信中の表示・エラー・成功メッセージ・通貨の更新)
  const runClaim = async (fn, okText) => {
    let got = null
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const r = await fn()
      setNotice(okText(r))
      if (r && r.amount > 0) got = [{ name: '交易石', count: r.amount }] // 受け取ったものは「報酬一覧」で見せる
      setMe(await api.fetchMe())
      setGifts((await api.fetchGifts()).gifts)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
    if (got) showRewards(got)
  }
  // 石購入(券・盟晶): 終わったら、持ち物を読み直す
  const runStone = async (fn, okText) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const r = await fn()
      setNotice(okText(r))
      setMe(await api.fetchMe())
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const handlePass = () => runStone(() => api.buyPass(), () => '月パスを買いました')
  const handleTicket = (kind, count) => runStone(() => api.exchangeTicket(kind, count), (r) => `${kind === 'normal' ? '通常採用券' : '限定採用券'} ×${r.count} を手に入れました`)
  const handleCrystal = (mode, amount) => runStone(() => api.exchangeCrystal(mode, amount), (r) => (mode === 'buy' ? `盟晶 ×${r.amount} に交換しました` : `交易石 ×${r.amount} に変換しました`))
  const handleLoginBonus = () => runClaim(api.claimLoginBonus, (r) => `ログインボーナス +${r.amount} 交易石${r.passBonus ? `(月パス +${r.passBonus} を含む)` : ''}(連続${r.streak}日目)`)
  const handleGift = (g) => runClaim(() => api.claimGift(g.id), (r) => `「${g.title}」を受け取りました +${r.amount} 交易石`)
  const handleGiftAll = () => {
    const list = gifts.filter((g) => !g.claimed)
    return runClaim(async () => {
      let amount = 0
      for (const g of list) amount += (await api.claimGift(g.id)).amount || 0
      return { amount, n: list.length }
    }, (r) => `${r.n}通を受け取りました +${r.amount} 交易石`)
  }
  // メールの既読・★・削除(画面はすぐ変え、サーバーに書く。失敗したら、一覧を読み直す)
  const syncMail = async (fn) => {
    try { await fn() } catch (e) { setError(e.message) }
    try { setGifts((await api.fetchGifts()).gifts) } catch { /* 次に開いたときに読み直す */ }
  }
  const handleMailRead = (g) => {
    if (g.read) return
    setGifts((list) => list.map((x) => (x.id === g.id ? { ...x, read: true } : x)))
    syncMail(() => api.markMailRead(g.id))
  }
  const handleMailStar = (g) => {
    setGifts((list) => list.map((x) => (x.id === g.id ? { ...x, star: !x.star } : x)))
    syncMail(() => api.setMailStar(g.id, !g.star))
  }
  const handleMailDelete = (g) => { setGifts((list) => list.filter((x) => x.id !== g.id)); return syncMail(() => api.deleteMail(g.id)) }
  const handleMailPurge = () => {
    setGifts((list) => list.filter((x) => !(x.read && x.claimed && !x.star)))
    return syncMail(() => api.purgeReadMail())
  }
  const handleCode = async () => {
    if (!code.trim()) return
    await runClaim(() => redeemCode(code), (r) => `合言葉を受け取りました +${r.amount} 交易石`)
    setCode('')
  }

  // 対戦の報酬(ログイン中だけ)。終わったら交易石の表示も更新する
  const rewardApi = user
    ? {
        start: startBattleTicket,
        record: recordMatch,
        finish: async (id, result) => {
          const r = await finishBattle(id, result)
          fetchMe().then(setMe).catch(() => {})
          return r
        },
      }
    : null

  // 起動中は、ロード画面を出しつづける(準備が全部できてから、いちどだけ開ける)
  if (!booted && gate !== 'locked') { // 入室制限で入れない人には、ロード画面を出さない
    return <LoadingScreen progress={bootProgress} note="サーバーが眠っていると、1分ほどかかることがあります" />
  }
  if (gate === 'checking') return <LoadingScreen note="サーバーが眠っていると、1分ほどかかることがあります" /> // 「もう一度つなぐ」を押したとき
  if (gate === 'offline') {
    return (
      <div style={{ padding: 20, fontFamily: FONT }}>
        <p>サーバーにつながりませんでした。しばらくしてからもう一度お試しください。</p>
        <button onClick={() => { setGate('checking'); setGateTry((n) => n + 1) }} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 15 }}>もう一度つなぐ</button>
      </div>
    )
  }
  if (gate === 'locked') {
    return (
      <GateScreen
        user={user}
        notice={error}
        onEnter={async (pw) => { await gateEnter(pw); setError(''); setGate('open') }}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    )
  }

  // ログインしていない人は、アカウント限定の画面にいられない(ホームに戻す)
  // ログインなしで解放しているときは、サーバーのデータを使わない画面(人事・編成・足跡)だけ開ける
  const canUse = (key) => !!user || canOpen(key, unlockLv)
  const current = ACCOUNT_SCREENS.includes(screen) && !canUse(screen) ? 'home' : screen
  const goHome = () => setScreen('home')

  const partyApi = partyUid && parties
    ? {
        parties,
        activeIdx,
        save: (i, slots, spellSet) => {
          const all = saveParty(partyUid, i, slots, spellSet)
          if (!all) return false
          setParties(all)
          return true
        },
        setActive: (i) => { setActiveIdx(i); setActiveParty(partyUid, i) },
      }
    : null

  if (current === 'play') {
    return <GuideScreen gems={me ? me.gems : null} onCpu={() => setScreen('cpu')} onRandom={() => setScreen('random')} onRules={() => { setRulesBack('play'); setScreen('rules') }} onExit={goHome} />
  }

  // ランダムマッチ(ランク/カジュアル): 画面 → (使用デッキの確認・変更で)チームを選ぶ → 画面にもどる
  if (current === 'random') {
    const activeP = partyApi && partyApi.parties ? partyApi.parties[partyApi.activeIdx] : null // 編成画面で選んでいるパーティ
    const saved = rankRun || (activeP && partyCount(activeP) > 0
      ? { team: partyToSlots(activeP, ALL_CHARACTERS).filter(Boolean), spells: partyToSpells(activeP, ALL_SPELLS) }
      : { team: (loadFormation(ALL_CHARACTERS) || defaultFormation(ALL_CHARACTERS, DEFAULT_PLAYER_IDS)).filter(Boolean), spells: loadSpellSet(ALL_SPELLS) })
    return (
      <ErrorBoundary onExit={() => setScreen('play')}>
        <RandomMatchScreen
          team={saved.team}
          spells={saved.spells}
          myName={me && me.displayName ? me.displayName : 'あなた'}
          onChangeTeam={() => setScreen('randomteam')}
          loggedIn={!!user}
          onRoom={() => { setPvpRun({ id: Date.now(), team: saved.team, spells: saved.spells }); setScreen('pvp') }}
          onExit={() => setScreen('play')}
        />
      </ErrorBoundary>
    )
  }
  if (current === 'randomteam') {
    return (
      <ErrorBoundary onExit={() => setScreen('random')}>
        <FormationScreen
          title="使用デッキ"
          allChars={ALL_CHARACTERS}
          defaultIds={DEFAULT_PLAYER_IDS}
          allSpells={ALL_SPELLS.filter((sp) => !sp.token)}
          parties={partyApi ? partyApi.parties : null}
          partyIdxInit={partyApi ? partyApi.activeIdx : null}
          onSaveParty={partyApi ? partyApi.save : null}
          onPartyChange={partyApi ? partyApi.setActive : null}
          onStart={(chars, spells) => { setRankRun({ team: chars.filter(Boolean), spells: spells || [] }); setScreen('random') }}
          onExit={() => setScreen('random')}
        />
      </ErrorBoundary>
    )
  }

  // 部屋コードで対戦(カジュアル)。ランダムマッチ画面から入る
  if (current === 'pvp') {
    if (!pvpRun) return <GuideScreen gems={me ? me.gems : null} onCpu={() => setScreen('cpu')} onRandom={() => setScreen('random')} onRules={() => { setRulesBack('play'); setScreen('rules') }} onExit={goHome} />
    return (
      <ErrorBoundary onExit={() => setScreen('play')}>
        <PvpScreen key={pvpRun.id} team={pvpRun.team} spells={pvpRun.spells} onExit={() => setScreen('random')} />
      </ErrorBoundary>
    )
  }

  // CPU戦: レベルを選ぶ
  if (current === 'cpu') {
    return (
      <ErrorBoundary onExit={() => setScreen('play')}>
        <CpuBattleScreen
          levels={unlockLv >= 1 ? [...CPU_LEVEL_LIST, TEST_ENTRY] : CPU_LEVEL_LIST}
          levelIdInit={unlockLv >= 1 || cpuSel !== 'test' ? cpuSel : `lv${cpuLevel}`}
          onSelect={(l) => { setCpuSel(l.id); if (!l.test) setCpuLevel(l.num) }}
          onChallenge={(l) => { setCpuSel(l.id); if (!l.test) setCpuLevel(l.num); setScreen('team') }}
          onExit={() => setScreen('play')}
        />
      </ErrorBoundary>
    )
  }

  // チーム: 対戦に出すキャラ・スペルを選ぶ(アカウントなら、保存したパーティーも選べる)
  if (current === 'team') {
    return (
      <ErrorBoundary onExit={() => setScreen('cpu')}>
        <FormationScreen
          title="チーム"
          allChars={ALL_CHARACTERS}
          defaultIds={DEFAULT_PLAYER_IDS}
          allSpells={ALL_SPELLS.filter((sp) => !sp.token)}
          parties={partyApi ? partyApi.parties : null}
          partyIdxInit={partyApi ? partyApi.activeIdx : null}
          onSaveParty={partyApi ? partyApi.save : null}
          onPartyChange={partyApi ? partyApi.setActive : null}
          onStart={(chars, spells) => {
            if (cpuSel === 'test' && unlockLv >= 1) { setTestMine({ team: chars, spells: spells || [] }); setScreen('testopp'); return }
            setCpuRun({ id: Date.now(), level: cpuLevel, team: chars, spells: spells || [] }); setScreen('loading')
          }}
          onExit={() => setScreen('cpu')}
        />
      </ErrorBoundary>
    )
  }

  // テスト戦: 相手(CPU)のチームを選ぶ(マスターパスワードを解除している間だけ)
  if (current === 'testopp') {
    if (unlockLv < 1 || !testMine) return <GuideScreen gems={me ? me.gems : null} onCpu={() => setScreen('cpu')} onRandom={() => setScreen('random')} onRules={() => { setRulesBack('play'); setScreen('rules') }} onExit={goHome} />
    return (
      <ErrorBoundary onExit={() => setScreen('cpu')}>
        <FormationScreen
          title="相手のチーム(テスト戦)"
          allChars={ALL_CHARACTERS}
          defaultIds={DEFAULT_PLAYER_IDS}
          allSpells={ALL_SPELLS.filter((sp) => !sp.token)}
          parties={partyApi ? partyApi.parties : null} // 事前に準備したパーティーを、相手のチームにも使える(ここでは保存も、使用中パーティーの切り替えもしない)
          partyIdxInit={partyApi ? partyApi.activeIdx : null}
          onStart={(chars, spells) => {
            setCpuRun({ id: Date.now(), level: 1, team: testMine.team, spells: testMine.spells, test: { team: chars.filter(Boolean), spells: spells || [] } })
            setScreen('loading')
          }}
          onExit={() => setScreen('team')}
        />
      </ErrorBoundary>
    )
  }

  if (current === 'loading') return <LoadingScreen duration={1400} />

  if (current === 'battle') {
    if (!cpuRun) return <GuideScreen gems={me ? me.gems : null} onCpu={() => setScreen('cpu')} onRules={() => { setRulesBack('play'); setScreen('rules') }} onExit={goHome} />
    return (
      <ErrorBoundary onExit={() => setScreen('cpu')}>
        <BattleScreen
          key={cpuRun.id}
          levelInit={cpuRun.level}
          teamInit={cpuRun.team}
          spellsInit={cpuRun.spells}
          testInit={cpuRun.test || null}
          onExit={() => setScreen('cpu')}
          onBackLevel={() => setScreen('cpu')}
          onBackTeam={() => setScreen('team')}
          rewardApi={rewardApi}
          partyApi={partyApi}
          cpuDelay={cpuDelayOf(settings)}
        />
      </ErrorBoundary>
    )
  }

  if (current === 'agents') {
    if (!me && user) return <LoadingScreen />
    // ログインなしで解放しているときは、全キャラを持っているものとして見せる
    const ownedMap = user && me ? me.owned || {} : Object.fromEntries(ALL_CHARACTERS.map((c) => [c.id, 1]))
    return <ErrorBoundary onExit={goHome}><JinjiScreen ownedMap={ownedMap} sigMap={(user && me && me.sig) || {}} enhMap={(user && me && me.enh) || {}} onEnhance={user ? async (id) => { await api.enhanceChar(id); setMe(await api.fetchMe()) } : null} onExit={goHome} /></ErrorBoundary>
  }

  if (current === 'party') {
    if (!partyApi) return null // パーティーは、この端末から一瞬で読み込まれる(ロード画面を一瞬だけ出すと、ちらつくため、何も出さない)
    return (
      <ErrorBoundary onExit={goHome}>
        <FormationScreen
          title="編成"
          allChars={ALL_CHARACTERS}
          allSpells={ALL_SPELLS.filter((sp) => !sp.token)}
          parties={partyApi.parties}
          partyIdxInit={activeIdx ?? 0}
          onSaveParty={partyApi.save}
          onPartyChange={partyApi.setActive}
          onExit={goHome}
        />
      </ErrorBoundary>
    )
  }

  if (current === 'career') {
    return <ErrorBoundary onExit={() => setScreen('home')}><CareerScreen onExit={() => setScreen('home')} fetchCareer={user ? fetchCareer : () => Promise.resolve({ matches: [] })} clearCareer={user ? clearCareer : () => Promise.resolve()} /></ErrorBoundary>
  }

  if (current === 'rules') {
    return <ErrorBoundary onExit={() => setScreen('home')}><RulesScreen first={rulesFirst} onExit={() => { setRulesFirst(false); setScreen(rulesFirst ? 'home' : rulesBack) }} /></ErrorBoundary>
  }

  if (current === 'news') {
    return <ErrorBoundary onExit={() => setScreen('home')}><NewsScreen onExit={() => setScreen('home')} /></ErrorBoundary>
  }

  if (current === 'codex') {
    return <ErrorBoundary onExit={() => setScreen('home')}><WikiScreen onExit={() => setScreen('home')} /></ErrorBoundary>
  }

  // ---- 部品 ----
  const btn = (primary, disabled) => ({
    padding: desktop ? '10px 18px' : '12px 16px', borderRadius: 10, fontSize: desktop ? 15 : 16, fontWeight: 700, fontFamily: FONT,
    border: `1.5px solid ${disabled ? C.line : primary ? C.player : C.line}`,
    background: disabled ? C.disabledBg : primary ? C.player : C.card,
    color: disabled ? C.disabledInk : primary ? C.onAccent : C.ink,
    cursor: disabled ? 'default' : 'pointer',
  })
  const card = (bg = C.card) => ({ padding: desktop ? 20 : 14, borderRadius: 14, background: bg, border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(31,42,68,0.06)' })
  const h3 = { margin: '0 0 8px', fontSize: desktop ? 18 : 16 }

  const gachaCard = user && (
    <div style={card()}>
      <h3 style={h3}>ガチャ</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={busy || !me} onClick={() => handleGacha(1)} style={{ ...btn(true, busy || !me), flex: 1 }}>
          1回ガチャ({COST})
        </button>
        <button disabled={busy || !me} onClick={() => handleGacha(10)} style={{ ...btn(true, busy || !me), flex: 1 }}>
          10連ガチャ({COST * 10})
        </button>
      </div>
      {busy && <p style={{ fontSize: 13, color: C.mute, marginBottom: 0 }}>通信中...(最初の1回は1分ほどかかることがあります)</p>}
    </div>
  )

  const giftCard = user && (
    <div style={card(C.softWarn)}>
      <h3 style={h3}>プレゼントBOX</h3>
      {gifts.length === 0 ? (
        <p style={{ fontSize: 13, margin: '4px 0' }}>受け取れるプレゼントはありません</p>
      ) : (
        gifts.map((g) => (
          <div key={g.id} style={{ margin: '8px 0', fontSize: 14 }}>
            {g.title} +{g.gems}交易石{' '}
            <button disabled={busy} onClick={() => handleGift(g)} style={{ ...btn(false, busy), padding: '6px 12px', fontSize: 14 }}>受け取る</button>
            {g.message && <div style={{ fontSize: 12, color: C.mute }}>{g.message}</div>}
          </div>
        ))
      )}
    </div>
  )

  const resultsCard = results && (
    <div style={card()}>
      <h3 style={h3}>ガチャの結果</h3>
      <div style={desktop ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 } : undefined}>
        {results.map((pull, i) => (
          <div key={i} style={{ marginBottom: desktop ? 0 : 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {i + 1}回目{pull.pity ? '(天井!)' : ''}
            </div>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              {pull.characters.map((c, j) => (
                <li key={j} style={{ color: RARITY[c.rarity].color }}>
                  [{RARITY[c.rarity].label}] {c.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )

  // ---- 共通の枠: 上の帯(// タイトル と 丸い ×)+ 中身。light=明るい灰色の画面 ----
  const shell = (title, body, { light = false, tabs = null, tab = null, setTab = null } = {}) => (
    <div className={light ? 'theme-light' : 'theme-dark'} style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 6 }}>
        <ScreenHeader title={title} onClose={goHome} right={me && <Chip><IconGem style={{ color: '#ffe600' }} />{me.gems}</Chip>} />
        {tabs && <PillTabs tabs={tabs} value={tab} onChange={setTab} />}
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: desktop ? '28px 24px' : '14px 12px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gap: desktop ? 20 : 12 }}>{body}</div>
      </div>
    </div>
  )

  // ガチャ
  if (current === 'gacha') {
    return (
      <GachaScreen
        me={me}
        busy={busy}
        error={error}
        results={results}
        cost={COST}
        pityCount={PITY_COUNT}
        onPull={handleGacha}
        onCloseResults={() => setResults(null)}
        onExit={() => { setResults(null); setError(''); goHome() }}
      />
    )
  }

  // 購買部(いまは、ログインボーナスと合言葉。あとで買い物の機能を足す)
  if (current === 'store') {
    return (
      <ErrorBoundary onExit={goHome}>
        <StoreScreen
          me={me}
          busy={busy}
          notice={notice}
          error={error}
          tab={storeTab}
          onTab={setStoreTab}
          stoneTab={stoneTab}
          onStoneTab={setStoneTab}
          onTicket={handleTicket}
          onPass={handlePass}
          onCrystal={handleCrystal}
          code={code}
          onCode={setCode}
          onClaimBonus={handleLoginBonus}
          onRedeem={handleCode}
          pityCount={PITY_COUNT}
          onExit={() => { setError(''); setNotice(''); goHome() }}
        />
      </ErrorBoundary>
    )
  }

  // メールボックス(プレゼント)
  if (current === 'mail') {
    return <MailboxScreen gifts={gifts} busy={busy} notice={notice} error={error} onClaim={handleGift} onClaimAll={handleGiftAll} onRead={handleMailRead} onStar={handleMailStar} onDelete={handleMailDelete} onPurge={handleMailPurge} onExit={() => { setNotice(''); setError(''); goHome() }} />
  }

  // 設定(参考: エンドフィールドの設定)
  if (current === 'settings') {
    return (
      <SettingsScreen
        user={user}
        settings={settings}
        onChange={(next) => { setSettings(next); saveSettings(next) }}
        onLogin={handleLogin}
        onLogout={handleLogout}
        unlockLevel={unlockLv}
        onUnlock={async (pw) => { const lv = await tryUnlock(pw); if (lv) setUnlockLv((v) => Math.max(v, lv)); return lv > 0 }}
        onRelock={() => { relock(); setUnlockLv(0) }}
        onOpenRules={() => { setRulesBack('settings'); setScreen('rules') }}
        onExit={goHome}
      />
    )
  }

  // ---- ホーム: 項目の名前だけ。選ぶと、それぞれの画面が開く(ログイン限定の項目は、ログインなしだと開かない) ----
  return (
    <HomeScreen
      user={user}
      me={me}
      lockedKey={lockedKey}
      unlockLevel={unlockLv}
      giftCount={gifts.filter((g) => !g.claimed).length}
      onSelect={(key) => {
        if (ACCOUNT_SCREENS.includes(key) && !canUse(key)) { setLockedKey(key); return }
        setLockedKey(null)
        setError('')
        setNotice('')
        setScreen(key)
      }}
      onLogin={handleLogin}
      onLogout={handleLogout}
    />
  )
}
