/**
 * metricsService.js
 *
 * Thu thập metrics từ Kubernetes cluster và format theo chuẩn
 * Prometheus text exposition format (plain text, content-type: text/plain).
 *
 * Metrics được expose:
 *   - k8s_nodes_total              : tổng số Node
 *   - k8s_nodes_ready              : số Node đang Ready
 *   - k8s_pods_total               : tổng số Pod (theo namespace)
 *   - k8s_pods_running             : số Pod đang Running (theo namespace)
 *   - k8s_pods_not_running         : số Pod không Running (theo namespace)
 *   - k8s_pod_restarts_total       : tổng restart count (theo pod, namespace)
 *   - k8s_services_total           : tổng số Service (theo namespace)
 *   - app_scrape_duration_seconds  : thời gian scrape (giây)
 */

const { getPods } = require('./podsService');
const { getNodes } = require('./nodesService');
const { getServices } = require('./servicesService');

/**
 * Escape nhãn Prometheus để tránh ký tự đặc biệt.
 * @param {string} value
 * @returns {string}
 */
function escapeLabel(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Build chuỗi labels Prometheus: {key="val", ...}
 * @param {Record<string, string>} labels
 * @returns {string}
 */
function labelSet(labels) {
  const pairs = Object.entries(labels)
    .map(([k, v]) => `${k}="${escapeLabel(v)}"`)
    .join(',');
  return pairs ? `{${pairs}}` : '';
}

/**
 * Thu thập dữ liệu K8s và trả về chuỗi Prometheus text format.
 * @returns {Promise<string>}
 */
async function collectMetrics() {
  const scrapeStart = Date.now();

  // Fetch song song để giảm latency
  const [nodes, pods, services] = await Promise.all([
    getNodes(),
    getPods(),
    getServices(),
  ]);

  const lines = [];

  // ── 1. Node metrics ──────────────────────────────────────────────────────
  lines.push('# HELP k8s_nodes_total Total number of nodes in the cluster');
  lines.push('# TYPE k8s_nodes_total gauge');
  lines.push(`k8s_nodes_total ${nodes.length}`);

  const readyNodes = nodes.filter((n) => n.status === 'Ready').length;
  lines.push('# HELP k8s_nodes_ready Number of nodes in Ready state');
  lines.push('# TYPE k8s_nodes_ready gauge');
  lines.push(`k8s_nodes_ready ${readyNodes}`);

  // ── 2. Pod metrics (group by namespace) ──────────────────────────────────
  // Tổng số Pod theo namespace
  const podsByNs = {};
  const runningByNs = {};
  pods.forEach((pod) => {
    const ns = pod.namespace || 'unknown';
    podsByNs[ns] = (podsByNs[ns] || 0) + 1;
    if (pod.status === 'Running') {
      runningByNs[ns] = (runningByNs[ns] || 0) + 1;
    }
  });

  lines.push('# HELP k8s_pods_total Total number of pods per namespace');
  lines.push('# TYPE k8s_pods_total gauge');
  Object.entries(podsByNs).forEach(([ns, count]) => {
    lines.push(`k8s_pods_total${labelSet({ namespace: ns })} ${count}`);
  });

  lines.push('# HELP k8s_pods_running Number of Running pods per namespace');
  lines.push('# TYPE k8s_pods_running gauge');
  Object.entries(podsByNs).forEach(([ns]) => {
    const running = runningByNs[ns] || 0;
    lines.push(`k8s_pods_running${labelSet({ namespace: ns })} ${running}`);
  });

  lines.push('# HELP k8s_pods_not_running Number of non-Running pods per namespace');
  lines.push('# TYPE k8s_pods_not_running gauge');
  Object.entries(podsByNs).forEach(([ns, total]) => {
    const notRunning = total - (runningByNs[ns] || 0);
    lines.push(`k8s_pods_not_running${labelSet({ namespace: ns })} ${notRunning}`);
  });

  // Restart count theo từng Pod
  lines.push('# HELP k8s_pod_restarts_total Total restart count per pod');
  lines.push('# TYPE k8s_pod_restarts_total counter');
  pods.forEach((pod) => {
    const lbls = { namespace: pod.namespace || 'unknown', pod: pod.name || 'unknown' };
    lines.push(`k8s_pod_restarts_total${labelSet(lbls)} ${pod.restartCount || 0}`);
  });

  // ── 3. Service metrics (group by namespace) ───────────────────────────────
  const svcByNs = {};
  services.forEach((svc) => {
    const ns = svc.namespace || 'unknown';
    svcByNs[ns] = (svcByNs[ns] || 0) + 1;
  });

  lines.push('# HELP k8s_services_total Total number of services per namespace');
  lines.push('# TYPE k8s_services_total gauge');
  Object.entries(svcByNs).forEach(([ns, count]) => {
    lines.push(`k8s_services_total${labelSet({ namespace: ns })} ${count}`);
  });

  // ── 4. Scrape duration ────────────────────────────────────────────────────
  const scrapeDuration = (Date.now() - scrapeStart) / 1000;
  lines.push('# HELP app_scrape_duration_seconds Time taken to collect metrics from K8s API');
  lines.push('# TYPE app_scrape_duration_seconds gauge');
  lines.push(`app_scrape_duration_seconds ${scrapeDuration.toFixed(4)}`);

  // Prometheus text format kết thúc bằng newline
  return lines.join('\n') + '\n';
}

module.exports = { collectMetrics };
