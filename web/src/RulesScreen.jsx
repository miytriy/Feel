import { useRef, useState } from 'react'
import { useIsDesktop, C, FONT } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { KEYWORDS, TRIGGER_LABELS, CLASS_TRAITS } from './battle/engine.js'

// ルール説明(wiki形式): 数字や用語は、エンジンの現行ルールに合わせてある。
// 画像・動画(GIF)は、実際のバトル画面から撮ったもの(public/rules/)。
// first=true のときは「はじめて遊ぶ人向け」の見出しになり、いちばん下のボタンが「あそびはじめる」になる。

const M = (n) => `/rules/${n}`

const P = ({ children }) => <p style={{ margin: '8px 0', fontSize: 14, lineHeight: 1.85 }}>{children}</p>
const Ul = ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ul>
const Li = ({ children }) => <li style={{ margin: '5px 0', fontSize: 14, lineHeight: 1.75 }}>{children}</li>
const Box = ({ children, tone }) => (
  <div style={{ padding: '9px 12px', borderRadius: 8, background: tone === 'warn' ? C.softWarn : C.soft, fontSize: 13, margin: '10px 0', lineHeight: 1.75 }}>{children}</div>
)
const H3 = ({ children }) => <h3 style={{ margin: '18px 0 4px', fontSize: 15, borderLeft: `4px solid ${C.player}`, paddingLeft: 8 }}>{children}</h3>

// 図(画像・GIF)。キャプションつき。読み込みは、画面に近づいてから
function Fig({ src, caption, w = 220, h = null }) {
  return (
    <figure style={{ margin: '10px 0', textAlign: 'center' }}>
      <img src={M(src)} alt={caption} loading="lazy" decoding="async" width={w} height={h || undefined} style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, border: `1px solid ${C.line}`, background: C.paper }} />
      <figcaption style={{ fontSize: 12, color: C.mute, marginTop: 4, lineHeight: 1.6 }}>{caption}</figcaption>
    </figure>
  )
}
const Figs = ({ children }) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>{children}</div>

// 「要点」ボックス(章の先頭)
const Summary = ({ children }) => (
  <div style={{ margin: '4px 0 8px', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.paper, fontSize: 13, lineHeight: 1.75 }}>
    <b style={{ color: C.player }}>要点</b>　{children}
  </div>
)

const LEGEND = [
  ['ラウンド', '何ラウンド目か。バーが100進むごとに1つ増えます。'],
  ['戦闘実況(⌸)', '起きたことを、あとから読み返せます。開いている間は、再生が止まります。'],
  ['アクションバー', '誰がいつ動くかの順番。右下の数字は「あと何で動くか」(現在行動値)。'],
  ['チームの資源', 'MP・EP・奥義など、チームで共有する数値。「自分」「相手」の見出しの横に並びます。'],
  ['場のキャラ', '体力バーと、持っている能力が出ます。タップで選べます。'],
  ['召喚物の欄', '召喚物・アミュレットが出る場所。最大5体。いないときも、場所は空いています。'],
  ['直近の能力', 'いま発動した能力の名前と説明。'],
  ['攻撃する', '選んだ相手にスキルを使います。選んだ相手の情報と予想ダメージは、ボタンの上に出ます。'],
]

const SECTIONS = [
  {
    id: 'screen', title: '0. 画面の見かた',
    body: () => (
      <>
        <Summary>バトル画面の、どこに何が出るかの案内です。</Summary>
        <Figs>
          <Fig src="board.webp" caption="スマホのバトル画面(番号は下の説明と対応)" w={290} />
          <div style={{ flex: '1 1 240px', minWidth: 220 }}>
            <ol style={{ margin: '6px 0', paddingLeft: 22 }}>
              {LEGEND.map(([k, v]) => <Li key={k}><b>{k}</b>: {v}</Li>)}
            </ol>
          </div>
        </Figs>
      </>
    ),
  },
  {
    id: 'flow', title: '1. 勝ち方と流れ',
    body: () => (
      <>
        <Summary><b>相手の「場」のキャラを全員倒したら勝ち</b>です。召喚物は数えません。</Summary>
        <Ul>
          <Li>行動順になったキャラのターンで、<b>スキル</b>(攻撃などの基本行動)を1回使い、<b>ターン終了</b>します。</Li>
          <Li>スキルを使う前に、MPを払って<b>特性</b>を使ったり、<b>スペル</b>を使ったり、<b>進化</b>したりできます(何回でも。使ってもターンは続きます)。</Li>
          <Li>編成は、キャラ1〜5体と、アミュレット2つまで。</Li>
          <Li>決着がつかないまま長く続くと、引き分けになります。</Li>
        </Ul>
        <Box>はじめは「①画面の見かた ②アクションバー ③MPとEP」を読めば遊べます。</Box>
      </>
    ),
  },
  {
    id: 'bar', title: '2. アクションバー(行動の順番)',
    body: () => (
      <>
        <Summary>画面の上のバーが、<b>誰がいつ動くか</b>です。左にいるほど、もうすぐ動きます。右下の数字は<b>あと何で動くか(現在行動値)</b>で、0になった人が動きます。</Summary>
        <Ul>
          <Li>各キャラの待ち時間は <b>10000 ÷ 速度</b>。<b>速度が高いほど早く、何度も</b>動けます。</Li>
          <Li>バーが100進むごとに<b>1ラウンド</b>。バーの途中の「R」マークが、ラウンドの区切りです。</Li>
          <Li>ターンを終えたキャラは、<b>下へ消えて</b>、次の自分の番の位置に戻ります。</Li>
          <Li>場に出てきたキャラ(召喚など)は、<b>上からフェードイン</b>してバーに入ります。</Li>
        </Ul>
        <Figs>
          <Fig src="barturn.gif" caption="ターンを終えると、自分の次の順番の位置へ移動" w={400} />
          <Fig src="barsummon.gif" caption="召喚されたキャラは、バーに入る" w={400} />
        </Figs>
        <H3>行動順アップ・ダウン</H3>
        <P>能力で、現在行動値が<b>変わる</b>ことがあります。そのユニットの枠が光り、順番が入れ替わります。</P>
        <Ul>
          <Li><b>アップ(▲)</b>: 現在行動値を、待ち時間の○%ぶん<b>減らします</b>(0より下にはなりません)。順番が早まります。</Li>
          <Li><b>ダウン(▼)</b>: 現在行動値を、待ち時間の○%ぶん<b>増やします</b>。順番が遅れます。</Li>
          <Li>【疾走】は、<b>ラウンドの始まりに行動順100%アップ</b>。待ち時間の全部ぶんが引かれて、いきなり先頭へ進みます。</Li>
        </Ul>
        <Figs>
          <Fig src="barup.gif" caption="行動順アップ: 光って、先頭へ移動し、数字が減る" w={400} />
          <Fig src="bardown.gif" caption="行動順ダウン: 数字が増えて、後ろへ移動" w={400} />
        </Figs>
        <H3>特別な枠</H3>
        <Ul>
          <Li>【アクセラレート】を持つキャラは、バーに<b>もう1つ別の枠</b>(点線)が出ます。その順番が来たとき、MPを払って追加行動できます(見送りも可)。</Li>
          <Li>コンボの種類によっては、味方のバーに<b>「コンボリセット」</b>の枠が出て、そこでコンボ数が0に戻ります。</Li>
          <Li>持ち主のいないクレストには、カウントダウンの枠が並びます。</Li>
        </Ul>
      </>
    ),
  },
  {
    id: 'mp', title: '3. MP・EP・進化',
    body: () => (
      <>
        <Summary><b>MP</b>は特性・スペルを使うポイント。<b>EP</b>は進化に使うポイントで、<b>ラウンド5の始まりに2つ</b>もらえます。</Summary>
        <H3>MP</H3>
        <Ul>
          <Li>ラウンドが始まるたびに、<b>MPの上限が1増え</b>(最大10)、MPが<b>上限まで全回復</b>します。</Li>
          <Li>特性・スペル・アクセラレートで減ります。使い残しは次へ持ち越されません(毎回、上限まで戻ります)。</Li>
          <Li>MPが足りない特性は、選べません。</Li>
          <Li>【覚醒】は、自分のMPの上限が<b>7以上</b>のときに働きます。</Li>
        </Ul>
        <H3>EPと進化</H3>
        <Ul>
          <Li>EPは<b>最大2</b>。ラウンド5の始まりに、両チームに2つ配られます。</Li>
          <Li>EPを1つ使うと、そのキャラは<b>進化</b>。<b>HPと攻撃力が2倍</b>になり、【突進】を得ます。</Li>
          <Li>進化は一度きり。ラウンド4まではできません。召喚物も進化できます(アミュレットは進化しません)。</Li>
          <Li>能力の効果で進化することもあります(その場合、EPは使いません)。</Li>
        </Ul>
        <Figs><Fig src="evolve.gif" caption="進化: 光の柱と光の輪が広がり、体力と攻撃力が上がる" /></Figs>
      </>
    ),
  },
  {
    id: 'act', title: '4. スキル・特性・スペル',
    body: () => (
      <>
        <Summary>ターンの中でできること。<b>スキルを使うとターンが終わる</b>のは、スキルだけです。</Summary>
        <Ul>
          <Li><b>スキル</b>: そのキャラの基本の行動。1ターンに1回(連続で使えるキャラもいます)。</Li>
          <Li><b>特性</b>: MPを払って使う特別な能力。<b>スキルを使う前なら、何回でも</b>(MPと使用回数の許す限り)。使ってもターンは終わりません。</Li>
          <Li><b>スペル</b>: キャラとは別に、編成画面で選んでおく魔法(最大3つ)。MPを払って、<b>キャラの行動を消費せず</b>に使えます。各スペルは<b>1戦で1回</b>。</Li>
          <Li>場に出たばかりのターンは、【突進】【疾走】がないとスキルを使えません。</Li>
          <Li>特性とスペルは、<b>コンボ</b>と<b>奥義ゲージ</b>に数えられます。</Li>
          <Li>アクセラレートの枠のターンでは、スペルは使えません。【モード】を持つスペルは、使ったあとに効果を1つ選びます。</Li>
        </Ul>
        <Box>どんなスペルがあるかは、ホームの「資料集」で調べられます。</Box>
      </>
    ),
  },
  {
    id: 'dmg', title: '5. ダメージと回復',
    body: () => (
      <>
        <Summary>ダメージは<b>物理・魔法・確定</b>の3種類。数字の色で見分けます。</Summary>
        <Ul>
          <Li><b>物理</b>(白)は相手の防御力、<b>魔法</b>(青)は魔力を元にします。<b>確定</b>(虹色)は防御を無視します。</Li>
          <Li>クリティカルが出ると、ダメージが増えます(初期は、クリティカルレート5%・クリティカルダメージ+50%)。「CRIT」と出ます。</Li>
          <Li><b>アーマー</b>があると、ダメージの一部をアーマーが先に受け持ちます。</Li>
          <Li>【バリア】は、攻撃を<b>1回だけ0ダメージ</b>にして壊れます(7章)。</Li>
          <Li>【必殺】を持つキャラがスキルでダメージを与えると、さらに<b>ターゲットの最大HPの15%</b>を確定ダメージで与えます。</Li>
          <Li>【ドレイン】は、スキルで与えたダメージと同じだけ、自分を回復します。</Li>
        </Ul>
        <Figs>
          <Fig src="damage.gif" caption="ダメージ: 白=物理 / 青=魔法。CRITは大きく表示" />
          <Fig src="heal.gif" caption="回復: 緑の数字で、体力が増える" />
        </Figs>
        <P>強化と能力付与は、カードが光って、はっきり分かるように出ます。強化は金色(「攻撃力+30↑」など)、能力付与は水色(「【守護】獲得」など)。何体かにまとめて起きるときは、先に全員が強化され、そのあとで全員に能力が付きます。</P>
        <Figs><Fig src="buff.gif" caption="強化(金)→ 能力付与(水色)" /></Figs>
      </>
    ),
  },
  {
    id: 'death', title: '6. 倒れる・破壊と消滅・墓場',
    body: () => (
      <>
        <Summary>HPが0になると<b>破壊</b>(倒れる)。能力で<b>消滅</b>することもあります。<b>墓場</b>は、破壊でたまるチームのカウンターです。</Summary>
        <Figs>
          <Fig src="destroy.gif" caption="破壊: ぼやけて溶け、ドクロが出て砕ける(墓場が増える合図)" />
          <Fig src="vanish.gif" caption="消滅: 青い光の円に収束して消える" />
        </Figs>
        <Ul>
          <Li><b>破壊</b>: 【ラストワード】などの「倒れたとき」の能力が働きます。場のキャラが倒れると、墓場が<b>3</b>たまります。</Li>
          <Li>場のキャラが攻撃を受けるだけでも、墓場が<b>1</b>たまります(ドクロの演出は、倒れたときだけ)。</Li>
          <Li><b>消滅</b>: 破壊されずに消えます。墓場も増えず、ラストワードも、味方が戦闘不能になったときの能力も働きません。</Li>
          <Li>墓場は、【ネクロマンス】など、墓場を使う能力が消費します。</Li>
        </Ul>
      </>
    ),
  },
  {
    id: 'summon', title: '7. 召喚物とアミュレット',
    body: () => (
      <>
        <Summary>場のキャラとは別の「召喚物の欄」に出ます(最大5体)。勝敗には数えられません。</Summary>
        <Ul>
          <Li><b>召喚物</b>: 能力で召喚される仲間。スキルで戦えます。HPが0になると破壊されます。</Li>
          <Li>欄が満員(5体)だと、召喚できません。</Li>
          <Li><b>アミュレット</b>: 体力のない特別な召喚物。スキル攻撃はできず、相手のスキル攻撃の対象にもなりません。編成に入れると、バトル開始時から場にいます(最大2つ)。破壊・消滅・カウントダウンで、なくなります。</Li>
          <Li>相手の「場すべて」を対象にする能力は、場のキャラと召喚物の両方に効きます。</Li>
        </Ul>
        <Figs><Fig src="summon.gif" caption="召喚: 「登場!」と表示され、カードが入る" /></Figs>
      </>
    ),
  },
  {
    id: 'kw', title: '8. キーワード能力',
    body: () => {
      const MEDIA = {
        guard: ['guard.gif', '盤面: 緑の盾'],
        aura: ['aura.gif', '盤面: ◇が順に光る'],
        intimidate: ['intimidate.gif', '盤面: ◇の黄緑の光'],
        stealth: ['stealth.gif', '盤面: 半透明'],
        barrier: ['barrier.gif', '盤面: 水色の円'],
        earthSign: ['earth.gif', '盤面: オレンジの円と◇'],
      }
      const order = Object.keys(KEYWORDS)
      return (
        <>
          <Summary>キャラの説明に出てくる【 】の意味です。盤面にエフェクトが出る能力は、見た目も載せています。</Summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {order.map((id) => {
              const k = KEYWORDS[id]
              const m = MEDIA[id]
              return (
                <div key={id} style={{ display: 'flex', gap: 10, padding: 10, background: C.paper, borderRadius: 8, alignItems: 'center' }}>
                  {m && <img src={M(m[0])} alt={`【${k.label}】${m[1]}`} loading="lazy" decoding="async" width={92} height={92} style={{ flex: '0 0 auto', borderRadius: 6, objectFit: 'cover' }} />}
                  <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                    <b>【{k.label}】</b> {k.desc}
                    {m && <div style={{ fontSize: 11, color: C.mute }}>{m[1]}</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <H3>バリアが壊れるとき</H3>
          <P>バリアが攻撃を防ぐと、円が白く光って、放射状の光が走り、サッと消えます。</P>
          <Figs><Fig src="barrierbreak.gif" caption="バリア: 攻撃を1回防ぐと、白く発光して消える" /></Figs>
          <H3>相手から選ばれにくくする能力</H3>
          <Ul>
            <Li><b>守護</b>: 相手は、守護を持つキャラ以外を攻撃できません。</Li>
            <Li><b>威圧</b>: 相手の<b>スキル</b>で選ばれません。</Li>
            <Li><b>オーラ</b>: 相手の<b>能力</b>で選ばれません。</Li>
            <Li><b>潜伏</b>: 相手の特性で選ばれず、攻撃もされません。攻撃するか、能力でダメージを与えると失います。</Li>
            <Li><b>土の印</b>は、オーラと同じ効果(能力で選ばれない)も持ちます。</Li>
          </Ul>
        </>
      )
    },
  },
  {
    id: 'combo', title: '9. コンボ・連携・奥義',
    body: () => (
      <>
        <Summary>特性・スペルを使った回数や、スキルを使った回数を数えて、ちょうどになったときに効果が出る仕組みです。</Summary>
        <Ul>
          <Li><b>コンボ</b>: 【コンボ_N】を持つキャラは、<b>味方が特性(スペルも含む)を使った回数</b>を数え、ちょうどN回で発動します。自分以外の味方が使うと1増えます。</Li>
          <Li>コンボの種類によっては、味方のアクションバーに「コンボリセット」の枠が出て、そこでカウントが0に戻ります。</Li>
          <Li><b>連携</b>: 味方が場でスキルを使った回数。【連携_N】は、回数がNになったときに発動します。</Li>
          <Li><b>奥義</b>: 特性・スペルを使った合計が<b>10回以上</b>で【奥義】、<b>15回以上</b>で【解放奥義】が使えます。</Li>
          <Li><b>信仰値・クレスト</b>: キャラの能力で増えるチームのカウンター。条件つきの能力に使われます。</Li>
        </Ul>
        <Box>スペルは特性として数えられるので、コンボや奥義を進めるのに便利です。</Box>
      </>
    ),
  },
  {
    id: 'class', title: '10. クラス特性',
    body: () => (
      <>
        <Summary>チームを<b>すべて同じクラス</b>にそろえると働く、常時の特性です(ほかのクラスが1体でも混ざると、働きません)。</Summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
          {Object.entries(CLASS_TRAITS).map(([cls, t]) => (
            <div key={cls} style={{ padding: '6px 10px', background: C.paper, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
              <b>{cls}</b>: {t.desc}
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'trigger', title: '11. 発動タイミング',
    body: () => (
      <>
        <Summary>能力の先頭の【 】は、<b>いつ発動するか</b>を表します。</Summary>
        <P>{Object.values(TRIGGER_LABELS).join(' / ')}</P>
      </>
    ),
  },
]

export default function RulesScreen({ onExit, first = false }) {
  const desktop = useIsDesktop()
  const refs = useRef({})
  const [toc, setToc] = useState(false)
  const jump = (id) => refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT, padding: desktop ? 24 : 12 }}>
      <div style={{ margin: desktop ? '-24px -24px 16px' : '-12px -12px 12px' }}><ScreenHeader title={first ? 'はじめに' : 'ルール'} onClose={onExit} /></div>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <p style={{ fontSize: 14, color: C.mute, lineHeight: 1.7, margin: '0 0 10px' }}>
          ターン制のバトルです。{first ? 'まずは「0〜3」を読めば遊べます。' : '知りたい項目を目次から探してください。'}画像と動画(GIF)は、実際のバトル画面です。
        </p>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
          <button onClick={() => setToc((v) => !v)} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.ink, cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
            <span>目次</span><span style={{ color: C.mute }}>{toc || desktop ? '▲' : '▼'}</span>
          </button>
          {(toc || desktop) && (
            <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: desktop ? '1fr 1fr' : '1fr', gap: 2 }}>
              {SECTIONS.map((s) => (
                <li key={s.id}><button onClick={() => jump(s.id)} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: 14, color: C.player, cursor: 'pointer', padding: '5px 0', textAlign: 'left' }}>{s.title}</button></li>
              ))}
            </ol>
          )}
        </div>
        {SECTIONS.map((s) => (
          <section key={s.id} ref={(n) => { refs.current[s.id] = n }} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '4px 14px 14px', marginBottom: 12, scrollMarginTop: 56 }}>
            <h2 style={{ fontSize: 17, margin: '12px 0 6px', paddingBottom: 6, borderBottom: `1px solid ${C.line}` }}>{s.title}</h2>
            {s.body()}
          </section>
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
