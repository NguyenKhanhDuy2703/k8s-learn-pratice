/**
 * nodesService.js
 *
 * Gọi K8s API để lấy danh sách Node trong cluster.
 * Field trả về: name, status, capacity (cpu + memory).
 */

const { coreV1Api } = require('./k8sClient');

async function getNodes() {
  // listNode() -> lấy tất cả Node trong cluster (không filter namespace)
  const res = await coreV1Api.listNode();

  return res.body.items.map((node) => {
    // Status của Node được tính từ mảng conditions:
    // condition type="Ready" + status="True" -> Node đang healthy
    const conditions = node.status?.conditions || [];
    const readyCondition = conditions.find((c) => c.type === 'Ready');
    const nodeStatus = readyCondition?.status === 'True' ? 'Ready' : 'NotReady';

    return {
      name: node.metadata?.name,
      status: nodeStatus,
      capacity: {
        // capacity.cpu: số CPU (vd: "2"), capacity.memory: dung lượng RAM (vd: "4Gi")
        cpu: node.status?.capacity?.cpu,
        memory: node.status?.capacity?.memory,
      },
      labels: node.metadata?.labels || {},
    };
  });
}

module.exports = { getNodes };
