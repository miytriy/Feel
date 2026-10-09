import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import {
  fetchMe, drawGacha, claimLoginBonus, startBattleTicket, finishBattle, fetchGifts, claimGift, redeemCode,
} from './api.js'
import BattleScreen from './BattleScreen.jsx'

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
        finish: async (id, result) => {
          const r = await finishBattle(id, result)
          fetchMe().then(setMe).catch(() => {})
          return r
        },
      }
    : null

  if (authLoading) {
    return <div style={{ padding: 20 }}>読み込み中...</div>
  }

  if (screen === 'battle') {
    return <BattleScreen onExit={() => setScreen('home')} rewardApi={rewardApi} />
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1>Feel</h1>

      <p>
        <button onClick={() => setScreen('battle')}>CPU対戦</button>
      </p>

      {!user ? (
        <div>
          <p>ガチャを引くにはログインしてください</p>
          <button onClick={handleLogin}>Googleでログイン</button>
        </div>
      ) : (
        <div>
          <p>
            ログイン中: {user.displayName}{' '}
            <button onClick={handleLogout}>ログアウト</button>
          </p>

          {me && (
            <div>
              <p>通貨: {me.gems}</p>
              <div style={{ padding: 8, margin: '8px 0', borderRadius: 8, background: '#f3f6ff', fontSize: 14 }}>
                {me.loginBonus.canClaim ? (
                  <button disabled={busy} onClick={handleLoginBonus}>
                    ログインボーナスを受け取る(+{me.loginBonus.nextAmount})
                  </button>
                ) : (
                  <span>
                    ログインボーナス: 今日は受け取り済み(連続{me.loginBonus.streak}日)。明日は +{me.loginBonus.nextAmount}
                  </span>
                )}
                <div style={{ fontSize: 12, color: '#6b7488', marginTop: 4 }}>
                  今日の対戦報酬: {me.battle.todayCount}/{me.battle.dailyLimit}回(CPU対戦に勝つともらえます)
                </div>
              </div>
              <p>天井まで: あと{PITY_COUNT - me.pityCount}回</p>
              <p>所持キャラ: {Object.keys(me.owned).length}種類</p>
            </div>
          )}

          <button disabled={busy || !me} onClick={() => handleGacha(1)}>
            1回ガチャ({COST})
          </button>{' '}
          <button disabled={busy || !me} onClick={() => handleGacha(10)}>
            10連ガチャ({COST * 10})
          </button>

          <div style={{ marginTop: 16, padding: 8, borderRadius: 8, background: '#fff8e6' }}>
            <b>プレゼントBOX</b>
            {gifts.length === 0 ? (
              <p style={{ fontSize: 13, margin: '4px 0' }}>受け取れるプレゼントはありません</p>
            ) : (
              gifts.map((g) => (
                <div key={g.id} style={{ margin: '6px 0', fontSize: 14 }}>
                  {g.title} +{g.gems}ジェム{' '}
                  <button disabled={busy} onClick={() => handleGift(g)}>受け取る</button>
                  {g.message && <div style={{ fontSize: 12, color: '#6b7488' }}>{g.message}</div>}
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 12, padding: 8, borderRadius: 8, background: '#f3fff6' }}>
            <b>合言葉</b>
            <div style={{ marginTop: 4 }}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="合言葉を入力"
                maxLength={40}
                style={{ fontSize: 16, padding: 4 }}
              />{' '}
              <button disabled={busy || !code.trim()} onClick={handleCode}>受け取る</button>
            </div>
          </div>

          {busy && <p>通信中...(最初の1回は1分ほどかかることがあります)</p>}
        </div>
      )}

      {notice && <p style={{ color: '#1a7f4b', fontWeight: 700 }}>{notice}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {results &&
        results.map((pull, i) => (
          <div key={i}>
            <h3>
              {i + 1}回目{pull.pity ? '(天井!)' : ''}
            </h3>
            <ul>
              {pull.characters.map((c, j) => (
                <li key={j} style={{ color: RARITY[c.rarity].color }}>
                  [{RARITY[c.rarity].label}] {c.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}
