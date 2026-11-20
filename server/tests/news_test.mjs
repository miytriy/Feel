// ニュース(Firestore の news コレクション): node server/tests/news_test.mjs
import assert from 'node:assert/strict'
import { createApp } from '../app.js'
const docs = [
  ['n1', { date: '2026-11-20', cat: 'アップデート', title: '新しい機能', body: '一行目\n二行目\n\n三行目' }],
  ['n2', { date: '2026-11-21', cat: 'へんなカテゴリ', title: '新しいお知らせ', body: ['A', 'B'] }],
  ['n3', { date: '2026-11-22', cat: 'お知らせ', title: '非表示', body: 'x', published: false }],
  ['n4', { date: '2026-11-23', cat: 'お知らせ', body: '見出しなし' }],
]
const db = { collection: () => ({ get: async () => ({ docs: docs.map(([id, v]) => ({ id, data: () => v })) }), doc: () => ({}) }) }
const app = createApp({ db, auth: {}, FieldValue: {}, masterPassword: 'pw', randomId: () => 'x' })
const server = await new Promise((r) => { const s = app.listen(0, () => r(s)) })
const res = await fetch(`http://127.0.0.1:${server.address().port}/api/news`) // ログインなしで読める
const { news } = await res.json()
assert.equal(res.status, 200)
assert.deepEqual(news.map((n) => n.id), ['n2', 'n1'], '新しい順。非表示と見出しなしは出ない')
assert.deepEqual(news[1].body, ['一行目', '二行目', '三行目'], '改行で段落に分かれる')
assert.equal(news[0].cat, 'お知らせ', '知らないカテゴリは、お知らせ')
console.log('news ok')
server.close()
