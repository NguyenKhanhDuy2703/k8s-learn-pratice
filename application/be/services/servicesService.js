/**
 * servicesService.js
 *
 * Gọi K8s API để lấy danh sách Service trên toàn cluster.
 * Field trả về: name, namespace, type, selector, clusterIP, ports.
 */

const { coreV1Api } = require('./k8sClient');

async function getServices() {
  // listServiceForAllNamespaces() -> tất cả Service không phân biệt namespace
  const res = await coreV1Api.listServiceForAllNamespaces();

  return res.body.items.map((svc) => {
    return {
      name: svc.metadata?.name,
      namespace: svc.metadata?.namespace,
      // type: ClusterIP / NodePort / LoadBalancer / ExternalName
      type: svc.spec?.type || 'ClusterIP',
      // selector: label map dùng để match Pod (vd: { app: "nginx" })
      // Nếu null -> Service không route tới Pod nào (vd: ExternalName, headless)
      selector: svc.spec?.selector || null,
      clusterIP: svc.spec?.clusterIP,
      // ports: mảng { port, targetPort, protocol, nodePort (nếu NodePort) }
      ports: (svc.spec?.ports || []).map((p) => ({
        port: p.port,
        targetPort: p.targetPort,
        protocol: p.protocol,
        nodePort: p.nodePort || null,
      })),
    };
  });
}

module.exports = { getServices };
