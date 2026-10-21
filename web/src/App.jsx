import { useEffect, useMemo, useState } from 'react'
import RulesScreen from './RulesScreen.jsx'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import {
  gateStatus, gateEnter, gateCheck, gateMe, getGateToken, setGateToken, fetchMe, fetchCareer, recordMatch, clearCareer, drawGacha, claimLoginBonus, startBattleTicket, finishBattle, fetchGifts, claimGift, redeemCode, markMailRead, setMailStar, deleteMail, purgeReadMail,
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
import HomeScreen, { ACCOUNT_SCREENS, canOpen } from './HomeScreen.jsx'
import { unlockLevel, tryUnlock, relock } from './unlock.js'
import { createSandbox } from './sandbox.js'
import GuideScreen from './GuideScreen.jsx'
import CpuBattleScreen from './CpuBattleScreen.jsx'
import { CPU_LEVELS } from './battle/ai.js'
import { DEFAULT_PLAYER_IDS } from './battle/teams.js'
import { ScreenHeader, PillTabs, Chip, LoadingScreen } from './chrome.jsx'
import { IconGem } from './icons.jsx'
import { loadSettings, saveSettings, cpuDelayOf } from './settings.js'
import { ALL_CHARACTERS } from './battle/characters/index.js'
import { ALL_SPELLS } from './battle/spells/index.js'
import { loadParties, saveParty, getActiveParty, setActiveParty } from './battle/parties.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import GateScreen from './GateScreen.jsx'
import { useIsDesktop, C, FONT } from './ui.js'

const PITY_COUNT = 40
const COST = 500 // ガチャ1回のジェム(server/config.js の COST_PER_PULL と同じにする)

const RARITY = {
  legend: { label: 'レジェンド', color: '#a21caf' },
  gold: { label: 'ゴールド', color: '#a16207' },
  silver: { label: 'シルバー', color: '#5b6472' },
  bronze: { label: 'ブロンズ', color: '#b45309' },
}

// CPU戦のレベル一覧(レベルを選ぶ画面に出す)。報酬は server/config.js の BATTLE_REWARD と同じにする
const BATTLE_REWARD = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 60 }
const CPU_LEVEL_LIST = CPU_LEVELS.map((l) => ({
  id: `lv${l.level}`,
  num: l.level,
  name: `Lv.${l.level}`,
  title: l.name, // 「Lv.1」など
  area: 'CPU戦 ・ 通常戦',
  desc: l.description,
  rule: '相手のキャラクターをすべて倒すと、勝ちです。勝つと、ジェムがもらえます(ログイン中のみ・1日5回まで)。CPUのクラスは、毎回ランダムです。',
  rewards: [{ label: 'ジェム', amount: BATTLE_REWARD[l.level], type: 'gem' }],
}))

export default function App() {
  const [screen, setScreen] = useState('home')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('') // 受け取りに成功したときの表示
  const [gifts, setGifts] = useState([])
  const [code, setCode] = useState('')
  const [storeTab, setStoreTab] = useState('bonus') // 購買部のタブ
  const [settings, setSettings] = useState(loadSettings) // 設定(この端末に保存)
  const [rulesBack, setRulesBack] = useState('play') // ルールを閉じたときに戻る画面
  // PLAY → 案内所(play) → CPU戦のレベル(cpu) → チーム(team) → 読み込み(loading) → 対戦(battle)
  const [cpuLevel, setCpuLevel] = useState(2) // 選んだCPUのレベル
  const [cpuRun, setCpuRun] = useState(null) // 対戦の準備 { id, level, team, spells }
  const [lockedKey, setLockedKey] = useState(null) // ログインが必要な項目を、ログインなしで押したとき
  const [unlockLv, setUnlockLv] = useState(unlockLevel) // 設定でマスターパスワードを打つと、ログインが必要な機能を、ログインなしで使える(1=人事・編成・足跡 / 2=最高権限: ガチャ・メールも体験用)
  // 最高権限(レベル2)でログインしていないときだけ、ガチャとメールを、この端末の中だけの仮のデータで動かす(ページを読み込み直すと、最初から)
  const sandbox = useMemo(() => (!user && unlockLv >= 2 ? createSandbox({ characters: ALL_CHARACTERS, cost: COST }) : null), [!user && unlockLv >= 2]) // eslint-disable-line react-hooks/exhaustive-deps
  const api = sandbox || { fetchMe, fetchGifts, drawGacha, claimGift, markMailRead, setMailStar, deleteMail, purgeReadMail, claimLoginBonus, redeemCode }
  const [parties, setParties] = useState(null) // パーティー(最大5つ。ログイン中だけ)
  const [activeIdx, setActiveIdx] = useState(null) // 最後に選んだパーティーの番号
  const desktop = useIsDesktop() // 画面の幅が広い(PC)ときは、画面全体を使うレイアウトにする
  // 開発中の入口(マスターパスワード): checking=確認中 / locked=パスワードが必要 / open=入れる / offline=サーバーにつながらない
  const [gate, setGate] = useState('checking')
  const [gateTry, setGateTry] = useState(0)
  const [rulesFirst, setRulesFirst] = useState(false) // 初回だけ、ルール説明を自動で開く
  useEffect(() => {
    if (screen !== 'loading') return undefined
    const t = setTimeout(() => setScreen('battle'), 1600)
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
    setGate('checking') // ログイン・ログアウトのたびに、入れるかを確かめ直す
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
  }, [user, gateOpen])

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

  const handleLogin = async () => {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setError('ログインに失敗しました: ' + e.code)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const handleGacha = async (times) => {
    setBusy(true)
    setError('')
    try {
      const data = await api.drawGacha(times)
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
      if (r && r.amount > 0) got = [{ name: 'ジェム', count: r.amount }] // 受け取ったものは「報酬一覧」で見せる
      setMe(await api.fetchMe())
      setGifts((await api.fetchGifts()).gifts)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
    if (got) showRewards(got)
  }
  const handleLoginBonus = () => runClaim(api.claimLoginBonus, (r) => `ログインボーナス +${r.amount} ジェム(連続${r.streak}日目)`)
  const handleGift = (g) => runClaim(() => api.claimGift(g.id), (r) => `「${g.title}」を受け取りました +${r.amount} ジェム`)
  const handleGiftAll = () => {
    const list = gifts.filter((g) => !g.claimed)
    return runClaim(async () => {
      let amount = 0
      for (const g of list) amount += (await api.claimGift(g.id)).amount || 0
      return { amount, n: list.length }
    }, (r) => `${r.n}通を受け取りました +${r.amount} ジェム`)
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
    await runClaim(() => redeemCode(code), (r) => `合言葉を受け取りました +${r.amount} ジェム`)
    setCode('')
  }

  // 対戦の報酬(ログイン中だけ)。終わったらジェムの表示も更新する
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

  if (authLoading) {
    return <LoadingScreen />
  }

  if (gate === 'checking') {
    return <LoadingScreen note="サーバーが眠っていると、1分ほどかかることがあります" />
  }
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
    return <GuideScreen gems={me ? me.gems : null} onCpu={() => setScreen('cpu')} onRules={() => { setRulesBack('play'); setScreen('rules') }} onExit={goHome} />
  }

  // CPU戦: レベルを選ぶ
  if (current === 'cpu') {
    return (
      <ErrorBoundary onExit={() => setScreen('play')}>
        <CpuBattleScreen
          levels={CPU_LEVEL_LIST}
          levelIdInit={`lv${cpuLevel}`}
          onSelect={(l) => setCpuLevel(l.num)}
          onChallenge={(l) => { setCpuLevel(l.num); setScreen('team') }}
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
          allSpells={ALL_SPELLS.filter((sp) => !String(sp.type || '').startsWith('トークン'))}
          parties={partyApi ? partyApi.parties : null}
          partyIdxInit={partyApi ? partyApi.activeIdx : null}
          onSaveParty={partyApi ? partyApi.save : null}
          onPartyChange={partyApi ? partyApi.setActive : null}
          onStart={(chars, spells) => { setCpuRun({ id: Date.now(), level: cpuLevel, team: chars, spells: spells || [] }); setScreen('loading') }}
          onExit={() => setScreen('cpu')}
        />
      </ErrorBoundary>
    )
  }

  if (current === 'loading') return <LoadingScreen />

  if (current === 'battle') {
    if (!cpuRun) return <GuideScreen gems={me ? me.gems : null} onCpu={() => setScreen('cpu')} onRules={() => { setRulesBack('play'); setScreen('rules') }} onExit={goHome} />
    return (
      <ErrorBoundary onExit={() => setScreen('cpu')}>
        <BattleScreen
          key={cpuRun.id}
          levelInit={cpuRun.level}
          teamInit={cpuRun.team}
          spellsInit={cpuRun.spells}
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
    return <ErrorBoundary onExit={goHome}><JinjiScreen ownedMap={ownedMap} onExit={goHome} /></ErrorBoundary>
  }

  if (current === 'party') {
    if (!partyApi) return <LoadingScreen />
    return (
      <ErrorBoundary onExit={goHome}>
        <FormationScreen
          title="編成"
          allChars={ALL_CHARACTERS}
          allSpells={ALL_SPELLS.filter((sp) => !String(sp.type || '').startsWith('トークン'))}
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
            {g.title} +{g.gems}ジェム{' '}
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
