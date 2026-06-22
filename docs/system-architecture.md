# K8s Cluster Visualizer — Phân tích Kiến trúc Hệ thống

> Repo: [NguyenKhanhDuy2703/k8s-learn-pratice](https://github.com/NguyenKhanhDuy2703/k8s-learn-pratice)

---

## 1. Tổng quan

**K8s Cluster Visualizer** là web dashboard để visualize Kubernetes cluster theo thời gian thực, phong cách ArgoCD — hiển thị Service → WorkerNode → Pod theo từng namespace với layout tự động.

```mermaid
graph LR
    DEV["👨‍💻 Developer"] -->|"git push main"| GH["📦 GitHub\nRepository"]
    GH -->|"CI trigger"| GHA["⚙️ GitHub Actions"]
    GHA -->|"docker push"| DH["🐳 Docker Hub"]
    GHA -->|"update image tag"| GH
    GH -->|"GitOps sync"| ARGO["🔄 ArgoCD"]
    ARGO -->|"apply manifests"| K8S["☸️ Kubernetes Cluster"]
    USER["🌐 Browser"] -->|"NodePort :30090"| FE["React App\n(nginx)"]
    FE -->|"REST + WebSocket"| BE["Express.js\n:3001"]
    BE -->|"K8s API"| K8S
    PROM["📊 Prometheus"] -->|"scrape /metrics"| BE

    style DEV fill:#1565c0,stroke:#4a9eff,color:#fff
    style GH fill:#24292e,stroke:#586069,color:#fff
    style GHA fill:#2088ff,stroke:#4a9eff,color:#fff
    style DH fill:#0db7ed,stroke:#0099cc,color:#fff
    style ARGO fill:#f05033,stroke:#ff6b47,color:#fff
    style K8S fill:#326ce5,stroke:#4a9eff,color:#fff
    style USER fill:#1b5e20,stroke:#66bb6a,color:#fff
    style FE fill:#0d47a1,stroke:#4a9eff,color:#fff
    style BE fill:#1b5e20,stroke:#66bb6a,color:#fff
    style PROM fill:#e65100,stroke:#ff8a65,color:#fff
```

---

## 2. Tech Stack

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| **Backend** | Node.js 20 + Express 4 | REST API + Socket.io realtime |
| **K8s Client** | `@kubernetes/client-node` | Official JS client |
| **Frontend** | React 18 + Vite 5 | SPA |
| **Graph Layout** | `@xyflow/react` + `dagre` | ArgoCD-style LR diagram |
| **Realtime** | Socket.io | Pod watch events |
| **HTTP Client** | axios | FE → BE calls |
| **Web Server** | nginx:alpine | Serve static FE build |
| **Container** | Docker multi-stage | BE: single-stage, FE: 2-stage |
| **CI** | GitHub Actions | Reusable workflow templates |
| **CD** | ArgoCD (App of Apps) | GitOps pattern |
| **Policy** | OPA Gatekeeper | Admission control |
| **Observability** | Prometheus text format | `/metrics` endpoint |

---

## 3. Kiến trúc Backend

```mermaid
graph TD
    subgraph BE["🟢 Backend — Express.js :3001"]
        IDX["index.js\nExpress + Socket.io server"]

        subgraph ROUTES["Routes"]
            R1["/api/nodes"]
            R2["/api/pods"]
            R3["/api/services"]
            R4["/api/exec\nPOST — kubectl/helm/k9s only"]
            R5["/api/health\nGET — liveness check"]
            R6["/metrics\nGET — Prometheus format"]
        end

        subgraph SERVICES["Services"]
            S1["nodesService\nlistNode()"]
            S2["podsService\nlistPodForAllNamespaces()"]
            S3["servicesService\nlistServiceForAllNamespaces()"]
            S4["execService\nchild_process.exec()"]
            S5["metricsService\ncollect + format Prometheus"]
            S6["watchService\nWatch API → Socket.io emit"]
            S7["k8sClient\nKubeConfig.loadFromDefault()"]
        end

        IDX --> ROUTES
        R1 --> S1
        R2 --> S2
        R3 --> S3
        R4 --> S4
        R6 --> S5
        IDX --> S6
        S1 & S2 & S3 & S5 & S6 --> S7
    end

    S7 -->|"Bearer Token\n(ServiceAccount)"| KAPI["☸️ K8s API Server"]

    style BE fill:#0a1929,stroke:#4a9eff,color:#fff
    style ROUTES fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style SERVICES fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style S7 fill:#4a148c,stroke:#ce93d8,color:#fff
    style KAPI fill:#bf360c,stroke:#ff8a65,color:#fff
```

### API Endpoints

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/api/nodes` | Danh sách node: name, status, capacity | ServiceAccount |
| `GET` | `/api/pods` | Danh sách pod all namespaces: name, ns, status, restartCount, labels | ServiceAccount |
| `GET` | `/api/services` | Danh sách service all namespaces: name, type, selector, ports | ServiceAccount |
| `POST` | `/api/exec` | Chạy lệnh kubectl/helm/k9s/minikube | Whitelist |
| `GET` | `/api/health` | Health check `{status: "ok"}` | Public |
| `GET` | `/metrics` | Prometheus text exposition format 0.0.4 | Public (ClusterIP) |

### Realtime — Watch Service

```mermaid
sequenceDiagram
    participant BE as Backend
    participant KAPI as K8s API Server
    participant FE as Frontend (React)

    BE->>KAPI: GET /api/v1/pods?watch=true
    KAPI-->>BE: stream open (keep-alive)

    loop Pod events
        KAPI-->>BE: {type: ADDED|MODIFIED|DELETED, object: Pod}
        BE->>FE: socket.emit('pod_event', {type, pod})
        FE->>FE: setPods() — update React state
    end

    Note over BE,KAPI: Khi connection timeout (~5 phút)
    BE->>BE: setTimeout(watchPods, 5000)
    BE->>KAPI: reconnect
```

---

## 4. Kiến trúc Frontend

```mermaid
graph TD
    subgraph APP["⚛️ App.jsx"]
        HOOK["useClusterData()\n─────────────────\nfetch nodes/pods/services\nSocket.io listener\nWS status tracking"]

        subgraph LAYOUT["Layout"]
            SB["StatusBar\nnodes • pods • services count\nWS connected/disconnected"]
            TAB["NsTabBar\n[All] [ns1] [ns2]... [Terminal]"]
            CONTENT["Content Area"]
        end

        subgraph GRAPH["ClusterDiagram (ReactFlow)"]
            SVC["ServiceCard\n← source handle RIGHT\ntype / clusterIP / ports"]
            WG["WorkerGroup\ncontainer node\n(pointer-events: none)"]
            PC["PodCard\n→ target handle LEFT\nstatus / restartCount\nclick → PodSidebar"]
        end

        PS["PodSidebar\nslide-in detail panel"]
        WP["WarningPanel\ncritical / warning / info"]
        TERM["Terminal\nPOST /api/exec\nhistory ↑↓ / Ctrl+L"]
    end

    subgraph UTILS["Utils"]
        BG["buildGraph.js\nDagre LR layout\nbuildOverviewGraph()\nbuildGraphForNamespace()"]
        WA["warnings.js\nanalyzeWarnings()\nseverity: critical/warning/info"]
    end

    HOOK --> LAYOUT
    TAB -->|"__all__"| BG
    TAB -->|"namespace"| BG
    BG --> GRAPH
    PC -->|"click"| PS
    HOOK --> WA --> WP

    style APP fill:#0a1929,stroke:#4a9eff,color:#fff
    style GRAPH fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style UTILS fill:#1a3a2a,stroke:#66bb6a,color:#cec
```

### Graph Layout — Dagre LR

```mermaid
graph LR
    subgraph NS["Namespace: visualizer"]
        subgraph SVC_COL["Cột trái — Services"]
            S1["🔷 k8s-visualizer-be\nClusterIP:3001"]
            S2["🔷 k8s-visualizer-fe\nNodePort:30090"]
        end

        subgraph WN["WorkerNode: node-1"]
            P1["🟢 pod-be-xxx\nRunning"]
            P2["🟢 pod-fe-xxx\nRunning"]
        end
    end

    S1 -->|":3001 →"| P1
    S2 -->|":80 →"| P2

    style NS fill:#0a1929,stroke:#6366f1,color:#fff
    style SVC_COL fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style WN fill:#1a3a2a,stroke:#66bb6a,color:#cec
```

### Warning Logic

| Condition | Severity | Reason |
|---|---|---|
| `status == 'Failed'` | 🔴 Critical | Pod Failed |
| `restartCount >= 20` | 🔴 Critical | CrashLoopBackOff |
| `status == 'Unknown'` | 🟡 Warning | Node unreachable |
| `restartCount >= 5` | 🟡 Warning | High Restart Count |
| `Pending && !nodeName` | 🟡 Warning | Unscheduled Pod |

---

## 5. CI/CD Pipeline

```mermaid
flowchart TD
    subgraph TRIGGER["🔔 Trigger"]
        BE_PUSH["push main\napplication/be/**"]
        FE_PUSH["push main\napplication/fe/**"]
    end

    subgraph CI_BE["⚙️ CI Backend"]
        B1["template-docker-build\n────────────────\nCheckout\nVerify secrets\nDocker login\nbuild-push-action@v5\ntags: :SHA + :latest"]
        B2["template-update-manifest\n────────────────\nCheckout (GH_PAT)\nsed replace image tag\ngit commit\ngit pull --rebase\ngit push main"]
    end

    subgraph CI_FE["⚙️ CI Frontend"]
        F1["template-docker-build\n(same template)"]
        F2["template-update-manifest\n(same template)"]
    end

    subgraph CD["🔄 CD — ArgoCD GitOps"]
        ARGO["ArgoCD\ndetect manifest diff\nauto sync + selfHeal"]
    end

    subgraph CLUSTER["☸️ Kubernetes"]
        DEPLOY["Rolling update\nDeployment"]
    end

    BE_PUSH --> B1 --> B2
    FE_PUSH --> F1 --> F2
    B1 -->|"push image"| DH["🐳 Docker Hub"]
    F1 -->|"push image"| DH
    B2 -->|"update\ndeployment.yaml"| GIT["📦 Git main"]
    F2 -->|"update\ndeployment.yaml"| GIT
    GIT -->|"poll / webhook"| ARGO
    ARGO --> DEPLOY

    style TRIGGER fill:#0a1929,stroke:#4a9eff,color:#fff
    style CI_BE fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style CI_FE fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style CD fill:#3e1f00,stroke:#ff8a65,color:#fff
    style CLUSTER fill:#4a148c,stroke:#ce93d8,color:#fff
```

### Secrets cần thiết

| Secret | Dùng ở | Mục đích |
|---|---|---|
| `DOCKER_USERNAME` | CI build + manifest update | Docker Hub login + sed pattern |
| `DOCKER_PASSWORD` | CI build | Docker Hub push |
| `GH_PAT` | Manifest update | Push commit lên repo (bypass branch protection) |

---

## 6. ArgoCD — App of Apps

```mermaid
graph TD
    subgraph GIT["📦 Git — cd-application/"]
        ROOT["root-app.yaml\nwatches: apps/"]
        subgraph APPS["apps/"]
            BA["be-config.yaml\npath: cd-application/be"]
            FA["fe-config.yaml\npath: cd-application/fe"]
            RA["rbac-config.yaml\npath: cd-application/rbac"]
        end
        subgraph BE_DIR["be/"]
            BD["deployment.yaml"]
            BS["service.yaml"]
        end
        subgraph FE_DIR["fe/"]
            FD["deployment.yaml"]
            FS["service.yaml"]
        end
        subgraph RBAC_DIR["rbac/"]
            RB["rbac.yaml\nSA + ClusterRole\n+ ClusterRoleBinding"]
        end
    end

    subgraph ARGOCD["🔄 ArgoCD (namespace: argocd)"]
        RA_APP["Application\nroot-app"]
        BE_APP["Application\nbe-application"]
        FE_APP["Application\nfe-application"]
        RB_APP["Application\nrbac-application"]
        PROJ["AppProject\nvisualizer-project"]
    end

    ROOT --> RA_APP
    RA_APP --> BE_APP & FE_APP & RB_APP
    PROJ -.->|"governs"| BE_APP & FE_APP & RB_APP

    BA --> BE_APP --> BE_DIR
    FA --> FE_APP --> FE_DIR
    RA --> RB_APP --> RBAC_DIR

    style GIT fill:#0a1929,stroke:#4a9eff,color:#fff
    style ARGOCD fill:#3e1f00,stroke:#ff8a65,color:#fff
    style PROJ fill:#4a148c,stroke:#ce93d8,color:#fff
```

### AppProject Permissions

```mermaid
graph TD
    PROJ["AppProject: visualizer-project"]

    PROJ --> SRC["sourceRepos\ngithub.com/.../k8s-learn-pratice"]
    PROJ --> DEST["destinations\nnamespace: visualizer ✅\nnamespace: argocd ✅\nserver: kubernetes.default.svc"]
    PROJ --> CRW["clusterResourceWhitelist\nClusterRole ✅\nClusterRoleBinding ✅\nNamespace ✅"]
    PROJ --> NRW["namespaceResourceWhitelist\n* (tất cả) ✅"]

    style PROJ fill:#4a148c,stroke:#ce93d8,color:#fff
    style SRC fill:#0d47a1,stroke:#4a9eff,color:#fff
    style DEST fill:#1b5e20,stroke:#66bb6a,color:#fff
    style CRW fill:#bf360c,stroke:#ff8a65,color:#fff
    style NRW fill:#37474f,stroke:#90a4ae,color:#fff
```

### ArgoCD RBAC

| Role | Quyền | Hạn chế |
|---|---|---|
| `admin` (default) | Full access | — |
| `readonly` (default cho anonymous) | Chỉ xem | — |
| `developer` | get, sync, action, logs trong `visualizer/*` | ❌ delete, override, exec, sửa/xóa project |

---

## 7. Kubernetes — Namespace visualizer

```mermaid
graph LR
    subgraph NS["namespace: visualizer"]
        subgraph BE_POD["Deployment: k8s-visualizer-be"]
            BE_C["Container: be\nnkd7059181/k8s-visualizer-be:SHA\nport: 3001\nreq: 100m/128Mi\nlim: 300m/256Mi"]
        end

        subgraph FE_POD["Deployment: k8s-visualizer-fe"]
            FE_C["Container: fe\nnkd7059181/k8s-visualizer-fe:SHA\nport: 80 (nginx)\nreq: 50m/64Mi\nlim: 200m/128Mi"]
        end

        BE_SVC["Service: k8s-visualizer-be\nClusterIP:3001"]
        FE_SVC["Service: k8s-visualizer-fe\nNodePort:30090→80"]

        SA["ServiceAccount\nk8s-visualizer-sa"]
    end

    BE_SVC --> BE_POD
    FE_SVC --> FE_POD
    BE_POD --> SA

    style NS fill:#0a1929,stroke:#4a9eff,color:#fff
    style BE_POD fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style FE_POD fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style SA fill:#4a148c,stroke:#ce93d8,color:#fff
```

### Resource Limits

| Component | CPU Request | CPU Limit | Mem Request | Mem Limit |
|---|---|---|---|---|
| Backend | 100m | 300m | 128Mi | 256Mi |
| Frontend | 50m | 200m | 64Mi | 128Mi |

### Health Probes

| Component | Readiness | Liveness |
|---|---|---|
| Backend | `GET /api/health` delay:5s period:10s | `GET /api/health` delay:15s period:20s |
| Frontend | `GET /` delay:5s period:10s | — |

---

## 8. Security Architecture

```mermaid
graph TD
    subgraph SEC["🔐 Security Layers"]
        subgraph GATE["OPA Gatekeeper — Admission Control"]
            CT["ConstraintTemplate\nK8sRequireNonRoot\n────────────────\nRego rule: kiểm tra\ncontainers[].securityContext\n.runAsNonRoot == true"]
            CON["Constraint\nrequire-non-root-visualizer\n────────────────\nenforcementAction: DENY\nmatch: Deployment\nnamespace: visualizer"]
            CT --> CON
        end

        subgraph RBAC_SEC["K8s RBAC — Least Privilege"]
            SA2["ServiceAccount\nk8s-visualizer-sa"]
            CR["ClusterRole: reader\n────────────────\nnodes, pods\nservices, namespaces\nverbs: get/list/watch ONLY\n❌ create/delete/update"]
            CRB["ClusterRoleBinding\nSA ──► ClusterRole"]
            SA2 --> CRB --> CR
        end

        subgraph EXEC_SEC["Exec Security — Whitelist"]
            EX["POST /api/exec\n────────────────\nAllowed prefix only:\nkubectl ✅\nhelm ✅\nk9s ✅\nminikube ✅\nbash/sh/rm... ❌ 403"]
        end

        subgraph NET_SEC["Network Security"]
            CS["BE Service: ClusterIP\n/metrics không expose\nra ngoài internet"]
        end
    end

    TEST["test/bad-app.yaml\nnginx (root)\n→ bị Gatekeeper DENY\n→ dùng để test policy"]

    CON -->|"DENY on violation"| TEST

    style SEC fill:#0a1929,stroke:#ef9a9a,color:#fff
    style GATE fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style RBAC_SEC fill:#1b5e20,stroke:#66bb6a,color:#fff
    style EXEC_SEC fill:#e65100,stroke:#ffb74d,color:#fff
    style NET_SEC fill:#0d47a1,stroke:#4a9eff,color:#fff
    style TEST fill:#37474f,stroke:#90a4ae,color:#fff
```

---

## 9. Observability — Prometheus Metrics

```mermaid
graph LR
    PROM["📊 Prometheus\n(namespace: monitoring)"]
    BE_POD2["BE Pod\n:3001/metrics"]

    PROM -->|"kubernetes_sd_configs\nrole: pod\nannotation filter"| BE_POD2
    BE_POD2 -->|"K8s API"| KAPI2["☸️ K8s API"]

    subgraph METRICS["Metrics Exposed"]
        M1["k8s_nodes_total\nk8s_nodes_ready"]
        M2["k8s_pods_total{namespace}\nk8s_pods_running{namespace}\nk8s_pods_not_running{namespace}"]
        M3["k8s_pod_restarts_total\n{namespace, pod}"]
        M4["k8s_services_total{namespace}"]
        M5["app_scrape_duration_seconds"]
    end

    BE_POD2 --> METRICS

    style PROM fill:#e65100,stroke:#ffb74d,color:#fff
    style BE_POD2 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style KAPI2 fill:#bf360c,stroke:#ff8a65,color:#fff
    style METRICS fill:#0a1929,stroke:#4a9eff,color:#fff
```

**Pod Annotation để Prometheus tự discovery:**
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port:   "3001"
  prometheus.io/path:   "/metrics"
```

---

## 10. Cấu trúc thư mục

```
k8s-learn-pratice/
│
├── .github/workflows/
│   ├── ci-backend.yaml              # Trigger: application/be/**
│   ├── ci-frontend.yaml             # Trigger: application/fe/**
│   ├── template-docker-build.yaml   # Reusable: build + push image
│   └── template-update-manifest.yaml # Reusable: update image tag in Git
│
├── application/
│   ├── be/                          # Node.js Express backend
│   │   ├── index.js                 # Entry: Express + Socket.io
│   │   ├── routes/                  # nodes, pods, services, exec, metrics
│   │   ├── services/                # k8sClient, nodesService, podsService,
│   │   │                            # servicesService, execService,
│   │   │                            # watchService, metricsService
│   │   └── Dockerfile               # node:20-alpine, single-stage
│   │
│   └── fe/                          # React + Vite frontend
│       ├── src/
│       │   ├── App.jsx              # Root component
│       │   ├── api/k8sApi.js        # axios REST calls
│       │   ├── hooks/useClusterData.js # fetch + WS listener
│       │   ├── components/          # ClusterDiagram, StatusBar, NsTabBar,
│       │   │                        # PodSidebar, Terminal, WarningPanel
│       │   │   └── nodes/           # ServiceCard, PodCard, WorkerGroup, NsGroup
│       │   └── utils/
│       │       ├── buildGraph.js    # Dagre LR layout
│       │       └── warnings.js      # Pod warning analysis
│       ├── nginx.conf               # SPA fallback + gzip
│       └── Dockerfile               # Multi-stage: node build → nginx serve
│
└── cd-application/
    ├── root-app.yaml                # ArgoCD App of Apps entry point
    ├── project.yaml                 # AppProject: permissions + destinations
    ├── apps/
    │   ├── be-config.yaml           # ArgoCD App → cd-application/be/
    │   ├── fe-config.yaml           # ArgoCD App → cd-application/fe/
    │   └── rbac-config.yaml         # ArgoCD App → cd-application/rbac/
    ├── be/
    │   ├── deployment.yaml          # BE Deployment + Prometheus annotations
    │   └── service.yaml             # ClusterIP:3001
    ├── fe/
    │   ├── deployment.yaml          # FE Deployment
    │   └── service.yaml             # NodePort:30090
    ├── rbac/
    │   └── rbac.yaml                # ServiceAccount + ClusterRole + Binding
    ├── policy/
    │   ├── constrainttemplate-non-root.yaml  # OPA Rego rule
    │   └── constraint-non-root.yaml          # Enforce trên namespace visualizer
    ├── configmap/
    │   ├── argocd-cm-patch.yaml     # Tạo account 'developer'
    │   └── argocd-rbac-cm.yaml      # RBAC policy cho ArgoCD
    ├── service_monitoring/
    │   └── servicemonitor.yaml      # (TODO: ServiceMonitor cho Prometheus Operator)
    └── test/
        └── bad-app.yaml             # nginx root — dùng test Gatekeeper policy
```

---

## 11. Điểm cần cải tiến

```mermaid
mindmap
  root((🔧 Improvements))
    Security
      FE deployment thiếu\nsecurityContext.runAsNonRoot
      NetworkPolicy\nchặn ai được scrape /metrics
      CORS origin: '*'\ncần restrict production
    Observability
      servicemonitor.yaml\nchưa có nội dung
      Thiếu Grafana dashboard\nconfig
      FE chưa có /metrics endpoint
    Reliability
      FE dùng :latest tag\nkhông traceable
      replicas: 1\nno HA
      Thiếu PodDisruptionBudget
    CI/CD
      Thiếu test step\ntrong CI pipeline
      Thiếu image scan\n(Trivy/Snyk)
      Thiếu staging environment
    RBAC
      developer role\ncó thể sync production\nkhông qua review
```

### Chi tiết

| # | Vấn đề | Mức độ | Giải pháp đề xuất |
|---|---|---|---|
| 1 | FE deployment thiếu `runAsNonRoot: true` | 🔴 High | Thêm `securityContext` — hiện bị Gatekeeper chặn nên FE không deploy được |
| 2 | FE dùng `:latest` tag | 🟡 Medium | Dùng commit SHA giống BE, cập nhật CI workflow |
| 3 | `servicemonitor.yaml` trống | 🟡 Medium | Thêm ServiceMonitor config cho Prometheus Operator |
| 4 | `CORS: origin: '*'` | 🟡 Medium | Restrict về FE domain trong production |
| 5 | Không có NetworkPolicy | 🟡 Medium | Chỉ cho namespace `monitoring` scrape `/metrics` |
| 6 | CI thiếu test + image scan | 🟡 Medium | Thêm `npm test` + Trivy scan trước khi push |
| 7 | `replicas: 1` cả BE lẫn FE | 🟢 Low | Tăng lên 2+ cho HA, thêm PodDisruptionBudget |
