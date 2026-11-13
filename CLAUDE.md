# Feel 開発メモ(Claudeへの指示)

- 返信は簡潔な日本語。仮定は明示し、未確認のことは正直に書く。mainへ直接push。pushの前に必ず `git fetch origin` して `origin/main` にrebase。`git stash` は使わない。
- コミットメッセージの末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` と `Claude-Session: <セッションURL>` を付ける。
- **エフェクト・アニメーションは、すべて `web/EFFECTS.md` の規約に従う(過去のものも、これから作るものも)。** 高画質・高フレームレート(60fps以上)が必須。
- **画面から出て戻ってきたとき、タブ・選択項目は「最後に選んでいたもの」に戻す(先頭に戻さない)。** タブや選択の状態は `useState` ではなく、`web/src/ui.js` の `useRemembered(key, 初期値)` を使う。新しい画面でも同じ。
- **キーボード操作は `web/src/keys.js` の `ACTIONS` に足す。** 画面の中では `useHotkey(id, fn)`。キーは設定の「コンフィグ」で変えられ、ログイン中はアカウント(`/api/keys`)に保存される。新しい画面の「閉じる・戻る」ボタンには `aria-label="閉じる"` か `"戻る"` を付ける(Esc・Backspace がそれを押す)。
