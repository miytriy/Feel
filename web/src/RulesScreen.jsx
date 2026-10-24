import { useState } from 'react'
import { useIsDesktop, C, FONT } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { KEYWORDS, TRIGGER_LABELS } from './battle/engine.js'

// ルール説明: 初めての人向け。数字や用語はエンジンの実際のルールに合わせてある。
// first=true のときは「はじめて遊ぶ人向け」の見出しになり、下のボタンが「あそびはじめる」になる。

const Box = ({ children, tone }) => (
  <div style={{ padding: '8px 10px', borderRadius: 8, background: tone === 'warn' ? C.softWarn : C.soft, fontSize: 13, margin: '8px 0 0', lineHeight: 1.7 }}>{children}</div>
)
const P = ({ children }) => <p style={{ margin: '6px 0', fontSize: 14, lineHeight: 1.8 }}>{children}</p>
const Li = ({ children }) => <li style={{ margin: '4px 0', fontSize: 14, lineHeight: 1.7 }}>{children}</li>

// アクションバーの図(速度の違いで順番が決まる様子)
function BarDemo() {
  const rows = [['速い子', 12, 1], ['ふつう', 8, 2], ['おそい子', 5, 3]]
  return (
    <div style={{ margin: '8px 0', padding: 10, background: C.paper, borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: C.mute, marginBottom: 6 }}>例: 左にいるほど先に行動(速度が高い=左に近い)</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {rows.map(([n, spd, o]) => (
          <div key={n} style={{ padding: '6px 10px', borderRadius: 8, background: C.card, border: `1.5px solid ${o === 1 ? C.active : C.line}`, fontSize: 12, textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{o}番目</div>{n}<div style={{ color: C.mute }}>速度{spd}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SECTIONS = [
  {
    id: 'flow', title: '1. 勝ち方と流れ',
    body: () => (
      <>
        <P>2チーム(あなたと相手)で戦います。<b>相手の「場」のキャラを全員倒したら勝ち</b>です。召喚物は数えません。</P>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>行動順になったキャラのターンで、<b>スキル</b>(攻撃などの基本行動)を1回使い、<b>ターン終了</b>します。</Li>
          <Li>スキルを使う前に、MPを払って<b>特性</b>を使ったり、<b>スペル</b>を使ったり、<b>進化</b>したりできます。</Li>
          <Li>決着がつかないまま長く続くと引き分けになります。</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'bar', title: '2. アクションバー(行動の順番)',
    body: () => (
      <>
        <P>画面の上にある横のバーが、<b>誰がいつ動くか</b>を表します。左にいるキャラほど、もうすぐ行動します。</P>
        <BarDemo />
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>各キャラの待ち時間は <b>10000 ÷ 速度</b>。<b>速度が高いほど早く、何度も</b>動けます。</Li>
          <Li>バーが100進むごとに<b>1ラウンド</b>。ラウンドが進むとMPが増えます(下で説明)。</Li>
          <Li>バーの途中にある「R」マークは、ラウンドの区切りです。</Li>
          <Li>【アクセラレート】を持つキャラは、バーにもう1つ別の枠が出ます。その枠の順番が来たとき、MPを払って追加行動できます(見送りも可)。</Li>
          <Li>速度を上げる・下げる効果で、順番が入れ替わります。</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'mp', title: '3. MP と EP',
    body: () => (
      <>
        <P><b>MP</b>は特性・スペルを使うためのチーム共通のポイントです。</P>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>ラウンドが始まるたびに、<b>MPの上限が1増え</b>(最大10)、MPが<b>上限まで全回復</b>します。</Li>
          <Li>MPは特性やスペル、アクセラレートを使うと減ります。使わないぶんは次のラウンドに持ち越されません(毎回上限まで戻るだけ)。</Li>
          <Li>MPが足りないと、その特性は選べません。</Li>
        </ul>
        <P><b>EP</b>は<b>進化</b>に使うポイントです。<b>ラウンド5の開始時に2つもらえます</b>(最大2)。</P>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>EPを1つ使うと、キャラが<b>進化</b>:HPと攻撃力が2倍になり、【突進】を得ます。</Li>
          <Li>進化は一度きり。ラウンド5まではできません。</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'dmg', title: '4. ダメージのきまり',
    body: () => (
      <>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>ダメージには<b>物理・魔法・確定</b>があります。物理は相手の防御力、魔法は魔力を元にします。確定は防御を無視します。</Li>
          <Li>クリティカルが出ると、ダメージが増えます(初期はクリティカルレート5%・クリティカルダメージ+50%)。</Li>
          <Li>【バリア】は、攻撃を<b>1回だけ0ダメージ</b>にして壊れます。</Li>
          <Li>【必殺】を持つキャラがスキルでダメージを与えると、さらに<b>相手の現在HPの35%</b>を固定ダメージで与えます。</Li>
          <Li>攻撃を受けるたびに、チームの「墓場」が1たまります(墓場を使う能力用)。</Li>
        </ul>
        <Box>バトル中、攻撃のたびに「⚔誰が 何で 誰に 何ダメージ」が表示されます。直近の能力の欄でも確認できます。</Box>
      </>
    ),
  },
  {
    id: 'trait', title: '5. 特性・スキル',
    body: () => (
      <>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li><b>スキル</b>:そのキャラの基本の行動。1ターンに1回(連続で使えるキャラもいます)。</Li>
          <Li><b>特性</b>:MPを払って使う特別な能力。<b>スキルを使う前なら、何回でも</b>(MPと使用回数の許す限り)使えます。使ってもターンは終わりません。</Li>
          <Li>キャラが場に出たばかりのターンは、【突進】【疾走】がないとスキルを使えません。</Li>
          <Li>特性を使った回数は、「奥義」ゲージに数えられます。</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'combo', title: '6. コンボ',
    body: () => (
      <>
        <P>【コンボ_N】を持つキャラは、<b>味方が特性(スペルも含む)を使った回数</b>を数えていて、ちょうどN回になったときに効果が発動します。</P>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>自分以外の味方が特性やスペルを使うと、カウントが1増えます。</Li>
          <Li>カウントは、そのキャラのターンが終わって次のターンが来るまでの間に溜まります。</Li>
          <Li>コンボの種類によっては、味方のアクションバーに「コンボリセット」の枠が出て、そこでカウントがリセットされます。</Li>
        </ul>
        <Box>スペルは特性として数えられるので、コンボを進めるのに便利です。</Box>
      </>
    ),
  },
  {
    id: 'spell', title: '7. スペル',
    body: () => (
      <>
        <P>スペルは、<b>キャラとは別に、編成画面で選んでおく</b>チームの魔法です(最大3つ)。</P>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>自分のキャラのターン中に、MPを払って使えます。<b>キャラの行動(スキル・特性)は消費しません</b>。</Li>
          <Li>各スペルは<b>1戦で1回</b>だけ。クラスに制限があるスペルもあります。</Li>
          <Li>特性として数えられるので、<b>コンボ</b>や<b>奥義ゲージ</b>が進みます。</Li>
          <Li>アクセラレートの枠のターンでは使えません。</Li>
          <Li>【モード】を持つスペルは、使ったあとに効果を1つ選びます。</Li>
        </ul>
        <Box>どんなスペルがあるかは、ホームの「資料集」で検索できます。</Box>
      </>
    ),
  },
  {
    id: 'gauge', title: '8. 連携・奥義・そのほか',
    body: () => (
      <>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li><b>連携</b>:味方が場でスキルを使った回数。【連携_N】は、回数がNになったときに発動します。</Li>
          <Li><b>奥義</b>:特性・スペルを使った合計が<b>10回以上</b>で【奥義】、<b>解放奥義</b>は<b>15回以上</b>で使えるようになります(ゲージの数え方はキャラの能力に従います)。</Li>
          <Li><b>信仰値・クレスト・墓場</b>:キャラの能力で増えるチームのカウンターです。条件つきの能力に使われます。</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'kw', title: '9. キーワード能力・発動タイミング',
    body: () => (
      <>
        <P>キャラの説明に出てくる【 】の意味です。(資料集と同じ内容)</P>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
          {Object.values(KEYWORDS).map((k) => (
            <div key={k.label} style={{ padding: '6px 10px', background: C.paper, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
              <b>【{k.label}】</b> {k.desc}
            </div>
          ))}
        </div>
        <P><b>発動タイミング</b>: {Object.values(TRIGGER_LABELS).join(' / ')}</P>
      </>
    ),
  },
]

export default function RulesScreen({ onExit, first = false }) {
  const desktop = useIsDesktop()
  const [open, setOpen] = useState(() => new Set(first ? ['flow'] : []))
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const all = open.size === SECTIONS.length
  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT, padding: desktop ? 24 : 12 }}>
      <div style={{ margin: desktop ? '-24px -24px 16px' : '-12px -12px 12px' }}><ScreenHeader title={first ? 'はじめに' : 'ルール'} onClose={onExit} /></div>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <p style={{ fontSize: 14, color: C.mute, lineHeight: 1.7 }}>
          ターン制のバトルです。まずは①〜③を読めば遊べます。気になる項目をタップして開いてください。
        </p>
        <button onClick={() => setOpen(all ? new Set() : new Set(SECTIONS.map((s) => s.id)))} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, fontFamily: FONT, fontSize: 13, cursor: 'pointer' }}>
          {all ? 'すべて閉じる' : 'すべて開く'}
        </button>
        {SECTIONS.map((s) => (
          <div key={s.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => toggle(s.id)} style={{ width: '100%', textAlign: 'left', padding: '14px 14px', background: 'none', border: 'none', fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <span>{s.title}</span><span style={{ color: C.mute }}>{open.has(s.id) ? '▲' : '▼'}</span>
            </button>
            {open.has(s.id) && <div style={{ padding: '0 14px 14px' }}>{s.body()}</div>}
          </div>
        ))}
        {first && (
          <button onClick={onExit} style={{ width: '100%', marginTop: 8, padding: '16px', borderRadius: 12, border: 'none', background: C.player, color: C.onAccent, fontFamily: FONT, fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>
            あそびはじめる
          </button>
        )}
      </div>
    </div>
  )
}
