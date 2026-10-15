// Feel - 画面でエラーが起きたとき、真っ白にならずに、原因を表示して戻れるようにする
import { Component } from 'react'
import { C, FONT } from './ui.js'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('画面でエラー', error, info && info.componentStack)
  }
  render() {
    const e = this.state.error
    if (!e) return this.props.children
    const where = String((e.stack || '').split('\n').slice(0, 4).join('\n'))
    return (
      <div style={{ padding: 16, fontFamily: FONT, color: C.ink, background: C.paper, minHeight: '100vh', boxSizing: 'border-box' }}>
        <h3 style={{ marginTop: 0 }}>画面でエラーが起きました</h3>
        <div style={{ padding: 10, borderRadius: 8, background: '#fde8e8', color: '#c0392b', fontSize: 13, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{String(e.message || e)}{'\n'}{where}</div>
        <p style={{ fontSize: 12, color: C.mute }}>この文字をスクリーンショットで教えてください。</p>
        <button onClick={() => { this.setState({ error: null }); if (this.props.onExit) this.props.onExit() }} style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, fontSize: 14 }}>ホームに戻る</button>
      </div>
    )
  }
}
