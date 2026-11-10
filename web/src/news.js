// ニュースの記事。新しい記事は、配列の「先頭」に足す(新しい順)。
//   id    : 重ならない名前(未読の判定に使う)
//   date  : 'YYYY-MM-DD'
//   cat   : 'お知らせ' | 'アップデート' | 'イベント'
//   title : 見出し    body : 本文(段落は配列。1行ずつ)
export const NEWS_CATS = ['お知らせ', 'アップデート', 'イベント']
export const NEWS = [
  {
    id: '2026-11-10-rotation', date: '2026-11-10', cat: 'お知らせ',
    title: '今期のローテーション対象は「伝説の幕開け」',
    body: ['ローテーションで使えるのは、今期のローテーション対象のピックアップと、ベーシックです。', 'アンリミテッドは、これまでに登場したすべてのピックアップが使えます(一部のユニットは使用禁止になる場合があります)。', 'インフィニティは、使用禁止ユニットが指定されてからの登場となります。'],
  },
  {
    id: '2026-11-10-relic', date: '2026-11-10', cat: 'アップデート',
    title: '人事から遺物を持たせられるようになりました',
    body: ['人事のキャラ詳細で、遺物を自由に選んで持たせられます。', 'CPU戦・テスト戦・対人戦に反映されます。遺物にも、ローテーション・アンリミテッドのルールがあります。', '選んだ遺物は、この端末に覚えておきます。'],
  },
  {
    id: '2026-11-09-battle-ui', date: '2026-11-09', cat: 'アップデート',
    title: '戦闘画面の見やすさを改善しました',
    body: ['選んだユニットの性能メモを、新しい表示に変えました。キーワードの説明は、タップで「能力詳細」に出ます。', '左側に戦闘ログが出ます(最大3件、3秒で消えます)。スペルは場の下に並びます。', '空いているところをタップすると、性能メモを閉じられます。'],
  },
]
const SEEN = 'feel.news.seen'
const read = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]') } catch { return [] } }
export const isUnread = (id) => !read().includes(id)
export const unreadCount = () => { const s = read(); return NEWS.filter((n) => !s.includes(n.id)).length }
export const markRead = (id) => { try { const s = read(); if (!s.includes(id)) localStorage.setItem(SEEN, JSON.stringify([...s, id])) } catch { /* 保存できなくても、画面は動く */ } }
