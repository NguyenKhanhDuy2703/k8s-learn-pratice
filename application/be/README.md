# K8s Cluster Visualizer — Backend

Node.js + Express + @kubernetes/client-node

## Yêu cầu

- Node.js >= 18
- Một cluster K8s đang chạy (kind, minikube, EKS, GKE, …)
- `~/.kube/config` trỏ đúng tới cluster

## Cài dependency

```bash
cd be
npm install
```

## Chạy dev

```bash
npm run dev
# Server khởi động tại http://localhost:3001
```

## API Endpoints

| Method | Path           | Mô tả                          |
|--------|----------------|--------------------------------|
| GET    | /api/health    | Health check                   |
| GET    | /api/nodes     | Danh sách Node + capacity      |
| GET    | /api/pods      | Danh sách Pod (all namespaces) |
| GET    | /api/services  | Danh sách Service              |

## WebSocket

Server emit event `pod_event` qua Socket.io khi có Pod thay đổi:

```json
{
  "type": "ADDED" | "MODIFIED" | "DELETED",
  "pod": { "name": "...", "namespace": "...", "status": "...", ... }
}
```

## Kubeconfig

Backend tự động load từ `~/.kube/config`.  
Để trỏ sang cluster khác:

```bash
# kind
kind get kubeconfig --name my-cluster > ~/.kube/config

# minikube
minikube update-context
```
