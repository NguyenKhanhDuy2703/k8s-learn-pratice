/**
 * warnings.js
 *
 * Phân tích danh sách pods và trả về các cảnh báo có mức độ rõ ràng.
 *
 * Mức độ (severity):
 *   critical  → pod Failed hoặc CrashLoopBackOff
 *   warning   → restartCount cao, Pending lâu
 *   info      → Succeeded, Unknown
 */

export const SEVERITY = {
  critical: { label: 'Critical', color: '#f87171', bg: '#450a0a', border: '#dc2626', icon: '🔴' },
  warning:  { label: 'Warning',  color: '#fbbf24', bg: '#3f2a00', border: '#d97706', icon: '🟡' },
  info:     { label: 'Info',     color: '#60a5fa', bg: '#0c1a2e', border: '#2563eb', icon: '🔵' },
};

/**
 * analyzeWarnings(pods)
 * @param {object[]} pods
 * @returns {object[]} warnings — mỗi item: { pod, severity, reason, detail }
 */
export function analyzeWarnings(pods) {
  const warnings = [];

  pods.forEach(pod => {
    const { name, namespace, status, restartCount } = pod;

    if (status === 'Failed') {
      warnings.push({
        pod,
        severity: 'critical',
        reason: 'Pod Failed',
        detail: `Pod has exited with an error and is not running.`,
      });
      return;
    }

    if (status === 'Unknown') {
      warnings.push({
        pod,
        severity: 'warning',
        reason: 'Status Unknown',
        detail: `Node may be unreachable or pod status cannot be determined.`,
      });
      return;
    }

    if (restartCount >= 20) {
      warnings.push({
        pod,
        severity: 'critical',
        reason: 'CrashLoopBackOff',
        detail: `Pod has restarted ${restartCount} times — likely stuck in a crash loop.`,
      });
      return;
    }

    if (restartCount >= 5) {
      warnings.push({
        pod,
        severity: 'warning',
        reason: 'High Restart Count',
        detail: `Pod has restarted ${restartCount} times. Check application logs.`,
      });
      return;
    }

    if (status === 'Pending' && !pod.nodeName) {
      warnings.push({
        pod,
        severity: 'warning',
        reason: 'Unscheduled Pod',
        detail: `Pod is Pending and has not been scheduled to any node. Possible causes: insufficient resources, no matching node selector, or PVC not bound.`,
      });
    }
  });

  // Sort: critical trước, rồi warning, rồi info
  const order = { critical: 0, warning: 1, info: 2 };
  warnings.sort((a, b) => order[a.severity] - order[b.severity]);

  return warnings;
}
