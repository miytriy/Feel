# Feel 開発メモ(Claudeへの指示)

- 返信は簡潔な日本語。仮定は明示し、未確認のことは正直に書く。mainへ直接push。pushの前に必ず `git fetch origin` して `origin/main` にrebase。`git stash` は使わない。
- コミットメッセージの末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` と `Claude-Session: <セッションURL>` を付ける。
- **エフェクト・アニメーションは、すべて `web/EFFECTS.md` の規約に従う(過去のものも、これから作るものも)。** 高画質・高フレームレート(60fps以上)が必須。
