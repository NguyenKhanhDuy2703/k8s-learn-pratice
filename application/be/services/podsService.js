/**
 * podsService.js
 *
 * Gọi K8s API để lấy danh sách Pod trên toàn cluster (all namespaces).
 * Field trả về: name, namespace, status, nodeName, restartCount, labels.
 */

const { coreV1Api } = require('./k8sClient');

async function getPods() {
  // listPodForAllNamespaces() -> lấy tất cả Pod không phân biệt namespace
  const res = await coreV1Api.listPodForAllNamespaces();

  return res.body.items.map((pod) => {
    // Tính tổng restartCount từ tất cả container trong Pod
    const containerStatuses = pod.status?.containerStatuses || [];
    const restartCount = containerStatuses.reduce(
      (sum, cs) => sum + (cs.restartCount || 0),
      0
    );

    return {
      name: pod.metadata?.name,
      namespace: pod.metadata?.namespace,
      // phase: Running / Pending / Succeeded / Failed / Unknown
      status: pod.status?.phase || 'Unknown',
      // nodeName: tên Node mà Pod đang chạy trên đó (dùng để vẽ sơ đồ)
      nodeName: pod.spec?.nodeName || null,
      restartCount,
      // labels: dùng để Service selector matching
      labels: pod.metadata?.labels || {},
    };
  });
}

module.exports = { getPods };
