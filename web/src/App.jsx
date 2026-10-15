import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import {
  fetchMe, fetchCareer, recordMatch, clearCareer, drawGacha, claimLoginBonus, startBattleTicket, finishBattle, fetchGifts, claimGift, redeemCode,
} from './api.js'
import BattleScreen from './BattleScreen.jsx'
import CareerScreen from './CareerScreen.jsx'
import CodexScreen from './CodexScreen.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { useIsDesktop, C, FONT } from './ui.js'

const PITY_COUNT = 40
const COST = 100

const RARITY = {
  legend: { label: 'レジェンド', color: '#c026d3' },
  gold: { label: 'ゴールド', color: '#d4a017' },
  silver: { label: 'シルバー', color: '#6b7280' },
  bronze: { label: 'ブロンズ', color: '#92400e' },
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
  const desktop = useIsDesktop() // 画面の幅が広い(PC)ときは、画面全体を使うレイアウトにする

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

  useEffect(() => {
    if (!user) return
    setBusy(true)
    setError('')
    fetchMe()
      .then(setMe)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false))
    fetchGifts()
      .then((r) => setGifts(r.gifts))
      .catch(() => {}) // プレゼント一覧が取れなくても、他の機能は使える
  }, [user])

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
    return <div style={{ padding: 20, fontFamily: FONT }}>読み込み中...</div>
  }

  if (screen === 'battle') {
    return <ErrorBoundary onExit={() => setScreen('home')}><BattleScreen onExit={() => setScreen('home')} rewardApi={rewardApi} /></ErrorBoundary>
  }

  if (screen === 'career') {
    return <ErrorBoundary onExit={() => setScreen('home')}><CareerScreen onExit={() => setScreen('home')} fetchCareer={fetchCareer} clearCareer={clearCareer} /></ErrorBoundary>
  }

  if (screen === 'codex') {
    return <ErrorBoundary onExit={() => setScreen('home')}><CodexScreen onExit={() => setScreen('home')} /></ErrorBoundary>
  }

  // ---- 部品 ----
  const btn = (primary, disabled) => ({
    padding: desktop ? '10px 18px' : '12px 16px', borderRadius: 10, fontSize: desktop ? 15 : 16, fontWeight: 700, fontFamily: FONT,
    border: `1.5px solid ${disabled ? C.line : primary ? C.player : C.line}`,
    background: disabled ? '#f3f4f7' : primary ? C.player : C.card,
    color: disabled ? '#9aa1b2' : primary ? '#fff' : C.ink,
    cursor: disabled ? 'default' : 'pointer',
  })
  const card = (bg = C.card) => ({ padding: desktop ? 20 : 14, borderRadius: 14, background: bg, border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(31,42,68,0.06)' })
  const h3 = { margin: '0 0 8px', fontSize: desktop ? 18 : 16 }

  const careerBtn = (
    <button disabled={!user} onClick={() => setScreen('career')} style={{ ...btn(false, !user), width: '100%', marginTop: 10 }}>
      キャリア(対戦の記録・勝率){user ? '' : ' ※ログインが必要'}
    </button>
  )

  const playCard = (
    <div style={card()}>
      <h3 style={h3}>あそぶ</h3>
      <button onClick={() => setScreen('battle')} style={{ ...btn(true, false), width: '100%', fontSize: desktop ? 20 : 18, padding: desktop ? '22px 18px' : '18px 16px' }}>CPU対戦</button>
      <div style={{ fontSize: 12, color: C.mute, marginTop: 6 }}>キャラとスペルを編成して、CPUと対戦します。勝つとジェムがもらえます(ログイン中)。</div>
      {careerBtn}
      <button onClick={() => setScreen('codex')} style={{ ...btn(false, false), width: '100%', marginTop: 10 }}>
        資料集(キャラクター・スペルの一覧と検索)
      </button>
    </div>
  )

  const loginCard = (
    <div style={card()}>
      <h3 style={h3}>ログイン</h3>
      <p style={{ margin: '0 0 10px', fontSize: 14 }}>ガチャを引くにはログインしてください</p>
      <button onClick={handleLogin} style={btn(true, false)}>Googleでログイン</button>
    </div>
  )

  const accountCard = user && (
    <div style={card()}>
      <h3 style={h3}>アカウント</h3>
      <div style={{ fontSize: 14, marginBottom: 8 }}>
        ログイン中: <b>{user.displayName}</b>{' '}
        <button onClick={handleLogout} style={{ ...btn(false, false), padding: '4px 10px', fontSize: 12 }}>ログアウト</button>
      </div>
      {me && (
        <div>
          <div style={{ fontSize: desktop ? 30 : 26, fontWeight: 800, margin: '4px 0' }}>通貨: {me.gems}</div>
          <div style={{ padding: 10, margin: '8px 0', borderRadius: 10, background: '#f3f6ff', fontSize: 14 }}>
            {me.loginBonus.canClaim ? (
              <button disabled={busy} onClick={handleLoginBonus} style={btn(true, busy)}>
                ログインボーナスを受け取る(+{me.loginBonus.nextAmount})
              </button>
            ) : (
              <span>
                ログインボーナス: 今日は受け取り済み(連続{me.loginBonus.streak}日)。明日は +{me.loginBonus.nextAmount}
              </span>
            )}
            <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>
              今日の対戦報酬: {me.battle.todayCount}/{me.battle.dailyLimit}回(CPU対戦に勝つともらえます)
            </div>
          </div>
          <div style={{ fontSize: 14 }}>天井まで: あと{PITY_COUNT - me.pityCount}回</div>
          <div style={{ fontSize: 14 }}>所持キャラ: {Object.keys(me.owned).length}種類</div>
        </div>
      )}
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
    <div style={card('#fff8e6')}>
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
    <div style={card('#f3fff6')}>
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
      {error && <div style={{ color: 'red' }}>{error}</div>}
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

  const page = { minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT, boxSizing: 'border-box' }

  // ---- PC: 画面全体を使う(上=タイトル帯、下=3列のカード) ----
  if (desktop) {
    return (
      <div style={page}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 36px', background: C.card, borderBottom: `1px solid ${C.line}` }}>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: 1 }}>Feel</h1>
          <div style={{ flex: 1 }} />
          {user && me && <div style={{ fontSize: 16 }}>通貨 <b>{me.gems}</b></div>}
          {user ? <div style={{ fontSize: 14, color: C.mute }}>{user.displayName}</div> : <button onClick={handleLogin} style={btn(true, false)}>Googleでログイン</button>}
        </div>
        <div style={{ padding: '24px 36px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 20 }}>
              {playCard}
              {!user && loginCard}
              {accountCard}
            </div>
            <div style={{ display: 'grid', gap: 20 }}>
              {gachaCard}
              {resultsCard}
            </div>
            <div style={{ display: 'grid', gap: 20 }}>
              {giftCard}
              {codeCard}
            </div>
          </div>
          {messages}
        </div>
      </div>
    )
  }

  // ---- スマホ: 1列。押しやすい大きなボタンと、カードで区切った表示 ----
  return (
    <div style={{ ...page, padding: '12px 12px calc(20px + env(safe-area-inset-bottom))', maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ margin: '4px 0 12px', fontSize: 28 }}>Feel</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        {playCard}
        {!user && loginCard}
        {accountCard}
        {gachaCard}
        {messages}
        {resultsCard}
        {giftCard}
        {codeCard}
      </div>
    </div>
  )
}
