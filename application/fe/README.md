# K8s Cluster Visualizer — Frontend

React + Vite + @xyflow/react (React Flow)

## Yêu cầu

- Node.js >= 18
- Backend đang chạy (xem `../be/README.md`)

## Cài dependency

```bash
cd fe
npm install
```

## Cấu hình

Chỉnh file `.env` nếu backend chạy port khác:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

## Chạy dev

```bash
npm run dev
# Mở http://localhost:5173
```

## Sơ đồ hiển thị

| Thành phần | Ý nghĩa |
|---|---|
| Khung xanh lá lớn | K8s Node (Ready) |
| Khung đỏ lớn | K8s Node (NotReady) |
| Khung nhỏ bên trong | Pod đang chạy trên Node đó |
| Khung tím bên phải | Service |
| Đường nối có animation | Service -> Pod (selector match) |

## Tính năng

- **Click vào Pod** -> mở sidebar chi tiết (status, labels, restartCount)
- **WebSocket realtime**: Pod ADDED/MODIFIED/DELETED tự cập nhật sơ đồ
- **MiniMap** góc phải để navigate
- **Controls** zoom in/out/fit

## Cấu trúc src/

```
src/
├── api/
│   └── k8sApi.js          # Axios calls tới BE
├── components/
│   ├── nodes/
│   │   ├── NodeGroupNode.jsx  # K8s Node (group)
│   │   ├── PodNode.jsx        # Pod
│   │   └── ServiceNode.jsx    # Service
│   ├── PodSidebar.jsx         # Detail panel
│   └── StatusBar.jsx          # Header bar
├── hooks/
│   └── useClusterData.js  # Fetch + WebSocket hook
├── utils/
│   └── buildGraph.js      # K8s data -> React Flow graph
├── App.jsx
├── main.jsx
└── index.css
```
