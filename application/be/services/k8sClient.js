/**
 * k8sClient.js
 *
 * Khởi tạo Kubernetes client dùng chung cho toàn bộ app.
 *
 * loadFromDefault() sẽ tự động tìm kubeconfig theo thứ tự:
 *   1. Biến môi trường KUBECONFIG
 *   2. ~/.kube/config (mặc định)
 *   3. In-cluster config (nếu chạy bên trong Pod)
 *
 * Đây là cách chuẩn khi dev local với kind/minikube.
 */

const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();

// Tự động load từ ~/.kube/config hoặc KUBECONFIG env
kc.loadFromDefault();

// CoreV1Api cho nodes, pods, services
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);

module.exports = { kc, coreV1Api };
