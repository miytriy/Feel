// 対戦ルール(形式): ローテーションは今期(伝説の幕開け+ベーシック)だけ。アンリミテッド・インフィニティはすべて。 node server/tests/format_test.mjs
import assert from 'node:assert/strict'
import { loadRegistry } from '../pvp/registry.js'
import { buildTeam } from '../pvp/room.js'
const reg = await loadRegistry()
const R = reg.rotations
assert.ok(R.FORMATS.unlimited.open !== false && R.FORMATS.infinity.open !== false, 'アンリミ・インフィニティは解放済み')
const now = reg.chars.find((c) => c.rotation === '伝説の幕開け' && c.class === 'ウィッチ' && !c.amulet && !c.token)
const old = reg.chars.find((c) => c.rotation === 'インフィニティ・エボルヴ')
assert.ok(now && old)
const t = (c, extra = {}) => ({ ids: [c.id], spells: [], ...extra })
assert.ok(!buildTeam(reg, t(now), { format: 'rotation' }).error, '今期のキャラは、ローテーションで使える')
const e = buildTeam(reg, t(old), { format: 'rotation' }).error
assert.ok(e && e.includes('ローテーション'), 'ローテーション外のキャラは、ローテーションで使えない: ' + e)
for (const f of ['unlimited', 'infinity']) assert.ok(!buildTeam(reg, t(old), { format: f }).error, f + ' では使える')
// スペル
const oldSpell = reg.spells.find((s) => s.rotation && !R.rotationAllowed('rotation', s.rotation))
if (oldSpell) { const c = reg.chars.find((c) => c.rotation === '伝説の幕開け' && !c.amulet); const r = buildTeam(reg, { ids: [c.id], spells: [oldSpell.id] }, { format: 'rotation' }); assert.ok(r.error?.includes('ローテーション') || r.error, 'ローテーション外のスペルは使えない') }
console.log('format ok')
