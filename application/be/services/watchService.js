/**
 * watchService.js
 *
 * Dùng Watch API của @kubernetes/client-node để lắng nghe
 * các thay đổi Pod realtime và push về FE qua Socket.io.
 *
 * Cơ chế Watch trong K8s:
 * - Client gửi GET /api/v1/pods?watch=true
 * - API Server giữ kết nối mở và stream các event:
 *   { type: "ADDED" | "MODIFIED" | "DELETED", object: <Pod object> }
 * - Khi kết nối bị đóng (~5 phút timeout), ta tự reconnect.
 */

const k8s = require('@kubernetes/client-node');
const { kc } = require('./k8sClient');

/**
 * watchPods(io)
 * Bắt đầu watch tất cả Pod (all namespaces) và emit Socket.io event
 * khi có ADDED / MODIFIED / DELETED.
 *
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
function watchPods(io) {
  const watch = new k8s.Watch(kc);
  const watchPath = '/api/v1/pods';

  console.log('[Watch] Starting pod watch...');

  // watch() nhận: path, queryParams, callback(type, obj), doneCallback(err)
  watch
    .watch(
      watchPath,
      {}, // query params bổ sung nếu cần (vd: labelSelector, fieldSelector)
      (type, pod) => {
        // type: "ADDED" | "MODIFIED" | "DELETED"
        const podData = {
          name: pod.metadata?.name,
          namespace: pod.metadata?.namespace,
          status: pod.status?.phase || 'Unknown',
          nodeName: pod.spec?.nodeName || null,
          restartCount: (pod.status?.containerStatuses || []).reduce(
            (sum, cs) => sum + (cs.restartCount || 0),
            0
          ),
          labels: pod.metadata?.labels || {},
        };

        console.log(`[Watch] Pod event: ${type} -> ${podData.namespace}/${podData.name}`);

        // Emit event 'pod_event' tới tất cả FE clients đang kết nối
        // FE sẽ lắng nghe socket.on('pod_event', ...) và cập nhật state
        io.emit('pod_event', { type, pod: podData });
      },
      (err) => {
        // doneCallback: kết nối watch bị đóng (timeout bình thường) hoặc lỗi
        if (err) {
          console.error('[Watch] Watch error:', err.message || err);
        } else {
          console.log('[Watch] Watch connection closed, reconnecting in 5s...');
        }
        // Auto-reconnect để duy trì realtime
        setTimeout(() => watchPods(io), 5000);
      }
    )
    .catch((err) => {
      console.error('[Watch] Failed to start watch:', err.message || err);
      console.log('[Watch] Retrying in 10s...');
      setTimeout(() => watchPods(io), 10000);
    });
}

module.exports = { watchPods };
