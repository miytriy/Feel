import { useEffect, useState } from 'react'
import RulesScreen from './RulesScreen.jsx'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import {
  gateStatus, gateEnter, gateCheck, gateMe, getGateToken, setGateToken, fetchMe, fetchCareer, recordMatch, clearCareer, drawGacha, claimLoginBonus, startBattleTicket, finishBattle, fetchGifts, claimGift, redeemCode,
} from './api.js'
import BattleScreen from './BattleScreen.jsx'
import CareerScreen from './CareerScreen.jsx'
import CodexScreen from './CodexScreen.jsx'
import FormationScreen from './FormationScreen.jsx'
import HomeScreen, { PlayMenu, ACCOUNT_SCREENS } from './HomeScreen.jsx'
import { ScreenHeader, PillTabs, Chip, LoadingScreen } from './chrome.jsx'
import { IconGem } from './icons.jsx'
import { ALL_CHARACTERS } from './battle/characters/index.js'
import { ALL_SPELLS } from './battle/spells/index.js'
import { loadParties, saveParty, getActiveParty, setActiveParty } from './battle/parties.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import GateScreen from './GateScreen.jsx'
import { useIsDesktop, C, FONT } from './ui.js'

const PITY_COUNT = 40
const COST = 100

const RARITY = {
  legend: { label: 'レジェンド', color: '#a21caf' },
  gold: { label: 'ゴールド', color: '#a16207' },
  silver: { label: 'シルバー', color: '#5b6472' },
  bronze: { label: 'ブロンズ', color: '#b45309' },
}

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
  const [storeTab, setStoreTab] = useState('gacha') // STORE のタブ
  const [lockedKey, setLockedKey] = useState(null) // ログインが必要な項目を、ログインなしで押したとき
  const [parties, setParties] = useState(null) // パーティー(最大5つ。ログイン中だけ)
  const [activeIdx, setActiveIdx] = useState(null) // 最後に選んだパーティーの番号
  const desktop = useIsDesktop() // 画面の幅が広い(PC)ときは、画面全体を使うレイアウトにする
  // 開発中の入口(マスターパスワード): checking=確認中 / locked=パスワードが必要 / open=入れる / offline=サーバーにつながらない
  const [gate, setGate] = useState('checking')
  const [gateTry, setGateTry] = useState(0)
  const [rulesFirst, setRulesFirst] = useState(false) // 初回だけ、ルール説明を自動で開く
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
  useEffect(() => {
    if (!user) { setParties(null); setActiveIdx(null); return }
    setParties(loadParties(user.uid))
    setActiveIdx(getActiveParty(user.uid))
  }, [user])

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
      const data = await drawGacha(times)
      setResults(data.pulls)
      setMe(await fetchMe())
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // 受け取り系の操作の共通処理(通信中の表示・エラー・成功メッセージ・通貨の更新)
  const runClaim = async (fn, okText) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const r = await fn()
      setNotice(okText(r))
      setMe(await fetchMe())
      setGifts((await fetchGifts()).gifts)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const handleLoginBonus = () => runClaim(claimLoginBonus, (r) => `ログインボーナス +${r.amount} ジェム(連続${r.streak}日目)`)
  const handleGift = (g) => runClaim(() => claimGift(g.id), (r) => `「${g.title}」を受け取りました +${r.amount} ジェム`)
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
  const current = !user && ACCOUNT_SCREENS.includes(screen) ? 'home' : screen
  const goHome = () => setScreen('home')

  const partyApi = user && parties
    ? {
        parties,
        activeIdx,
        save: (i, slots, spellSet) => {
          const all = saveParty(user.uid, i, slots, spellSet)
          if (!all) return false
          setParties(all)
          return true
        },
        setActive: (i) => { setActiveIdx(i); setActiveParty(user.uid, i) },
      }
    : null

  if (current === 'play') {
    return <PlayMenu onBattle={() => setScreen('battle')} onRules={() => setScreen('rules')} onExit={goHome} />
  }

  if (current === 'battle') {
    return <ErrorBoundary onExit={() => setScreen('play')}><BattleScreen onExit={() => setScreen('play')} rewardApi={rewardApi} partyApi={partyApi} /></ErrorBoundary>
  }

  if (current === 'agents') {
    if (!me) return <LoadingScreen />
    return <ErrorBoundary onExit={goHome}><CodexScreen title="AGENTS" ownedMap={me.owned || {}} onExit={goHome} /></ErrorBoundary>
  }

  if (current === 'party') {
    if (!partyApi) return <LoadingScreen />
    return (
      <ErrorBoundary onExit={goHome}>
        <FormationScreen
          title="PARTY"
          allChars={ALL_CHARACTERS}
          allSpells={ALL_SPELLS.filter((sp) => sp.type !== 'トークン')}
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
    return <ErrorBoundary onExit={() => setScreen('home')}><CareerScreen onExit={() => setScreen('home')} fetchCareer={fetchCareer} clearCareer={clearCareer} /></ErrorBoundary>
  }

  if (current === 'rules') {
    return <ErrorBoundary onExit={() => setScreen('home')}><RulesScreen first={rulesFirst} onExit={() => { setRulesFirst(false); setScreen(rulesFirst ? 'home' : 'play') }} /></ErrorBoundary>
  }

  if (current === 'codex') {
    return <ErrorBoundary onExit={() => setScreen('home')}><CodexScreen onExit={() => setScreen('home')} /></ErrorBoundary>
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

  const bonusCard = user && me && (
    <div style={card()}>
      <h3 style={h3}>ログインボーナス</h3>
      <div style={{ padding: 10, borderRadius: 10, background: C.soft, fontSize: 14 }}>
        {me.loginBonus.canClaim ? (
          <button disabled={busy} onClick={handleLoginBonus} style={btn(true, busy)}>
            ログインボーナスを受け取る(+{me.loginBonus.nextAmount})
          </button>
        ) : (
          <span>今日は受け取り済み(連続{me.loginBonus.streak}日)。明日は +{me.loginBonus.nextAmount}</span>
        )}
        <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>
          今日の対戦報酬: {me.battle.todayCount}/{me.battle.dailyLimit}回(CPU対戦に勝つともらえます)
        </div>
      </div>
      <div style={{ fontSize: 14, marginTop: 8 }}>天井まで: あと{PITY_COUNT - me.pityCount}回</div>
    </div>
  )

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

  const codeCard = user && (
    <div style={card(C.softOk)}>
      <h3 style={h3}>合言葉</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="合言葉を入力"
          maxLength={40}
          style={{ fontSize: 16, padding: '8px 10px', flex: '1 1 160px', minWidth: 0, borderRadius: 8, border: `1px solid ${C.line}` }}
        />
        <button disabled={busy || !code.trim()} onClick={handleCode} style={btn(false, busy || !code.trim())}>受け取る</button>
      </div>
    </div>
  )

  const messages = (notice || error) && (
    <div style={{ marginTop: 12 }}>
      {notice && <div style={{ color: C.ok, fontWeight: 700 }}>{notice}</div>}
      {error && <div style={{ color: C.bad }}>{error}</div>}
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

  // ---- STORE: ガチャ・ログインボーナス・プレゼント・合言葉 ----
  if (current === 'store') {
    const tabs = [{ key: 'gacha', label: 'GACHA' }, { key: 'bonus', label: 'BONUS' }, { key: 'mail', label: 'MAIL' }, { key: 'code', label: 'CODE' }]
    const body = (
      <div style={{ display: 'grid', gap: desktop ? 20 : 12 }}>
        {messages}
        {storeTab === 'gacha' && <>{gachaCard}{resultsCard}</>}
        {storeTab === 'bonus' && bonusCard}
        {storeTab === 'mail' && giftCard}
        {storeTab === 'code' && codeCard}
      </div>
    )
    return (
      <div className="theme-light" style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 6 }}>
          <ScreenHeader title="STORE" onClose={goHome} right={me && <Chip><IconGem style={{ color: '#ffe600' }} />{me.gems}</Chip>} />
          <PillTabs tabs={tabs} value={storeTab} onChange={setStoreTab} />
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: desktop ? '28px 24px' : '14px 12px calc(20px + env(safe-area-inset-bottom))' }}>{body}</div>
      </div>
    )
  }

  // ---- ホーム: 項目の名前だけ。選ぶと、それぞれの画面が開く(ログイン限定の項目は、ログインなしだと開かない) ----
  return (
    <HomeScreen
      user={user}
      me={me}
      lockedKey={lockedKey}
      onSelect={(key) => {
        if (ACCOUNT_SCREENS.includes(key) && !user) { setLockedKey(key); return }
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
