/**
 * Terminal.jsx
 *
 * Mini terminal để chạy lệnh kubectl trực tiếp từ UI.
 * Gửi command lên BE (POST /api/exec), hiển thị output.
 */

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Gợi ý lệnh nhanh
const QUICK_CMDS = [
  'kubectl get pods -A',
  'kubectl get nodes -o wide',
  'kubectl get services -A',
  'kubectl get deployments -A',
  'kubectl top nodes',
  'kubectl top pods -A',
];

export default function Terminal() {
  const [history, setHistory] = useState([
    { type: 'info', text: '# K8s Terminal — chỉ cho phép: kubectl, helm, minikube' },
    { type: 'info', text: '# Gõ lệnh và nhấn Enter hoặc click Quick Commands bên dưới' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // cmdHistory: lưu lịch sử lệnh để dùng ↑↓ như terminal thật
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const outputRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll xuống cuối khi có output mới
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  async function runCommand(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Thêm dòng lệnh vào history hiển thị
    setHistory((h) => [...h, { type: 'cmd', text: `$ ${trimmed}` }]);
    setCmdHistory((h) => [trimmed, ...h]);
    setHistoryIdx(-1);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${BASE_URL}/api/exec`, { command: trimmed });
      const { stdout, stderr, exitCode } = res.data;

      if (stdout) {
        setHistory((h) => [...h, { type: 'stdout', text: stdout.trimEnd() }]);
      }
      if (stderr) {
        setHistory((h) => [...h, { type: 'stderr', text: stderr.trimEnd() }]);
      }
      if (!stdout && !stderr) {
        setHistory((h) => [...h, { type: 'info', text: `(exit ${exitCode})` }]);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setHistory((h) => [...h, { type: 'error', text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      runCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(next);
      setInput(cmdHistory[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? '' : cmdHistory[next]);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d1117',
        fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        fontSize: 13,
      }}
    >
      {/* Quick command buttons */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #21262d',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          background: '#161b22',
        }}
      >
        {QUICK_CMDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => runCommand(cmd)}
            style={{
              background: '#21262d',
              border: '1px solid #30363d',
              borderRadius: 5,
              color: '#58a6ff',
              fontSize: 11,
              padding: '3px 10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#30363d')}
            onMouseLeave={(e) => (e.target.style.background = '#21262d')}
          >
            {cmd}
          </button>
        ))}
        <button
          onClick={() => setHistory([])}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: '1px solid #30363d',
            borderRadius: 5,
            color: '#6e7681',
            fontSize: 11,
            padding: '3px 10px',
            cursor: 'pointer',
          }}
        >
          clear
        </button>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {history.map((line, i) => (
          <pre
            key={i}
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: 1.6,
              color:
                line.type === 'cmd'
                  ? '#f0f6fc'
                  : line.type === 'stderr'
                  ? '#ff7b72'
                  : line.type === 'error'
                  ? '#f85149'
                  : line.type === 'info'
                  ? '#6e7681'
                  : '#adbac7', // stdout
            }}
          >
            {line.text}
          </pre>
        ))}
        {loading && (
          <span style={{ color: '#58a6ff', animation: 'none' }}>⏳ running…</span>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: '1px solid #21262d',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#161b22',
        }}
      >
        <span style={{ color: '#3fb950', fontWeight: 700, flexShrink: 0 }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="kubectl get pods -A"
          autoFocus
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f0f6fc',
            fontFamily: 'inherit',
            fontSize: 13,
            caretColor: '#3fb950',
          }}
        />
        <span style={{ color: '#6e7681', fontSize: 11 }}>↑↓ history · Ctrl+L clear</span>
      </div>
    </div>
  );
}
