# Kubernetes Ingress, Ingress Controller & Gateway API

> 📖 Nguồn tổng hợp từ:
> - [DevOpsCube — Kubernetes Ingress Tutorial for Beginners](https://devopscube.com/kubernetes-ingress-tutorial/)
> - [DevOpsCube — Setup Nginx Ingress Controller on Kubernetes](https://devopscube.com/setup-ingress-kubernetes-nginx-controller/)
> - [Gateway API Official Docs](https://gateway-api.sigs.k8s.io/docs/introduction/)

---

## Tại sao cần Ingress?

Service `LoadBalancer` giải quyết external access, nhưng mỗi service cần **1 cloud load balancer riêng** → tốn tiền và khó quản lý khi có nhiều microservices.

```mermaid
flowchart LR
    subgraph WITHOUT["❌ Không có Ingress — nhiều LB"]
        LB1["☁️ Cloud LB #1\n$$$"] --> SVC1["shop-svc"]
        LB2["☁️ Cloud LB #2\n$$$"] --> SVC2["blog-svc"]
        LB3["☁️ Cloud LB #3\n$$$"] --> SVC3["api-svc"]
    end

    subgraph WITH["✅ Có Ingress — 1 LB duy nhất"]
        LB4["☁️ Cloud LB\n1 external IP\n$"] --> IC["🔀 Ingress Controller\nnginx / traefik"]
        IC -->|"/shop"| SVC4["shop-svc"]
        IC -->|"/blog"| SVC5["blog-svc"]
        IC -->|"/api"| SVC6["api-svc"]
    end

    style WITHOUT fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style WITH fill:#1b5e20,stroke:#66bb6a,color:#fff
    style IC fill:#0d47a1,stroke:#4a9eff,color:#fff
```

---

## 1. Ingress Resource (Object)

![Ingress & Ingress Controller](images/ingress-banner.png)

> Ingress là **Kubernetes native object** (như Pod, Deployment). Nó chỉ **chứa routing rules** — không tự làm routing.

```mermaid
flowchart TD
    subgraph ING_OBJ["📋 Ingress Object"]
        RULES["Routing Rules\n─────────────────────\nHost-based routing\nPath-based routing\nTLS configuration\nAnnotations"]
    end

    subgraph ETCD["🗄️ etcd"]
        STORED["Stored as K8s Object\n/registry/ingresses/..."]
    end

    IC["🔀 Ingress Controller\n(đọc rules, thực hiện routing)"]

    ING_OBJ -->|"kubectl apply"| ETCD
    IC -->|"watch ingress API"| ETCD

    style ING_OBJ fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style ETCD fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style IC fill:#e65100,stroke:#ffb74d,color:#fff
```

### YAML — Path-based Routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx          # Chỉ định Ingress Controller nào xử lý

  # TLS configuration
  tls:
    - hosts:
        - www.example.com
      secretName: example-tls-cert  # K8s Secret chứa cert

  rules:
    # Rule 1: Path-based routing
    - host: www.example.com
      http:
        paths:
          - path: /shop
            pathType: Prefix
            backend:
              service:
                name: shop-svc
                port:
                  number: 80
          - path: /blog
            pathType: Prefix
            backend:
              service:
                name: blog-svc
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-svc
                port:
                  number: 3000

    # Rule 2: Host-based routing
    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-svc
                port:
                  number: 80
```

### Path Types

| pathType | Hành vi | Ví dụ |
|---|---|---|
| `Exact` | Match chính xác | `/shop` chỉ match `/shop` |
| `Prefix` | Match prefix | `/shop` match `/shop`, `/shop/cart`, `/shop/pay` |
| `ImplementationSpecific` | Tùy controller | Behavior phụ thuộc Nginx/Traefik |

---

## 2. Ingress Controller

> Ingress Controller là **phần làm việc thật sự** — đọc Ingress rules và route traffic. Không có sẵn trong K8s, cần cài thêm.

![Kubernetes Ingress Traffic Flow](images/ingress-traffic-flow.png)

### Cơ chế hoạt động — Nginx Ingress Controller

![Nginx Ingress Controller internals](images/nginx-ingress-controller.png)

```mermaid
sequenceDiagram
    participant USER as 👤 User Browser
    participant LB as ☁️ Cloud LB
    participant NIC as 🔀 Nginx Ingress Controller Pod
    participant KAPI as ☸️ K8s API
    participant SVC as 🔷 Backend Service
    participant POD as 🟢 App Pod

    Note over NIC,KAPI: Startup: watch Ingress objects
    KAPI-->>NIC: stream Ingress events (watch)
    NIC->>NIC: Generate /etc/nginx/nginx.conf\nfrom Ingress rules

    Note over USER,POD: Request time
    USER->>LB: GET www.example.com/shop
    LB->>NIC: forward to NodePort
    NIC->>NIC: Match rule: /shop → shop-svc
    NIC->>SVC: proxy to shop-svc:80
    SVC->>POD: route to healthy pod
    POD-->>USER: HTTP Response
```

### Nginx config được generate tự động

```nginx
# /etc/nginx/conf.d/production-ecommerce-ingress.conf
# Auto-generated từ Ingress object

upstream shop-svc-80 {
    server 10.1.0.10:80;  # Pod IPs
    server 10.1.0.11:80;
}

server {
    listen 80;
    server_name www.example.com;

    location /shop {
        proxy_pass http://shop-svc-80;
    }
    location /blog {
        proxy_pass http://blog-svc-80;
    }
}
```

---

## 3. Nginx Ingress Controller — Kiến trúc chi tiết

```mermaid
graph TD
    subgraph NS_INGRESS["namespace: ingress-nginx"]
        subgraph CTRL["Ingress Controller Deployment"]
            NGINX["🔀 Nginx Pod\n─────────────────────\nnginx.conf (lua template)\nlistens :80 :443\nwatches Ingress API\n/etc/nginx/conf.d/"]
        end

        subgraph ADMISSION["Admission Controller (port 8443)"]
            WEBHOOK["Validating Webhook\n─────────────────────\nValidate Ingress objects\nbefore creation\nPrevent bad configs"]
        end

        SVC_CTRL["Service: ingress-nginx-controller\ntype: LoadBalancer\nport: 80, 443"]
        SVC_ADM["Service: admission\nport: 443 → 8443"]
    end

    subgraph APP_NS["namespace: production"]
        ING["📋 Ingress Object\nrouting rules"]
        APP_SVC["🔷 ClusterIP Services"]
        APP_POD["🟢 App Pods"]
    end

    EXT["🌐 External Traffic"] --> SVC_CTRL --> NGINX
    NGINX -->|"watch rules"| ING
    NGINX -->|"proxy"| APP_SVC --> APP_POD

    K8S_API["☸️ K8s API"] -->|"validate"| WEBHOOK

    style NS_INGRESS fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style APP_NS fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style NGINX fill:#0d47a1,stroke:#4a9eff,color:#fff
    style WEBHOOK fill:#4a148c,stroke:#ce93d8,color:#fff
```

### Admission Controller — validate Ingress objects

![Nginx Admission Controller Flow](images/nginx-admission-controller.png)

Admission Controller ngăn deploy Ingress với config sai — bảo vệ tất cả routing rules hiện tại:

```
kubectl apply -f bad-ingress.yaml
    │
    ▼
K8s API Server
    │ gửi đến ValidatingWebhookConfiguration
    ▼
Nginx Admission Controller :8443
    │ validate ingress spec
    ├── ✅ Valid → tạo Ingress object
    └── ❌ Invalid → reject với error message
```

---

## 4. Cài đặt Nginx Ingress Controller

### Bằng Helm (khuyến nghị production)

```bash
# Add repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux

# Verify
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### Bằng Manifest (dev/learning)

```bash
# Clone manifests
git clone https://github.com/techiescamp/nginx-ingress-controller
cd nginx-ingress-controller/manifests

# Deploy tất cả
kubectl apply -f .

# Kiểm tra
kubectl get all -n ingress-nginx
```

### Các K8s objects được tạo

```
ingress-nginx namespace
├── ServiceAccount: ingress-nginx + ingress-nginx-admission
├── ClusterRole/ClusterRoleBinding (admission + controller)
├── Role/RoleBinding (admission + controller)
├── ValidatingWebhookConfiguration: ingress-nginx-admission
├── Jobs: create + patch webhook CA bundle
├── ConfigMap: nginx controller config
├── Deployment: ingress-nginx-controller
└── Services:
    ├── ingress-nginx-controller (LoadBalancer: 80, 443)
    └── ingress-nginx-controller-admission (ClusterIP: 443)
```

---

## 5. So sánh Ingress Controllers phổ biến

| Controller | Công ty | Use Case | Điểm nổi bật |
|---|---|---|---|
| **Nginx (community)** | Kubernetes | General purpose | Phổ biến nhất, tài liệu phong phú |
| **Nginx (Nginx Inc)** | F5/Nginx | Enterprise | Commercial support |
| **Traefik** | Traefik Labs | Microservices | Auto-discover, dashboard đẹp |
| **HAProxy** | HAProxy Tech | High performance | Rất nhanh, nhiều protocol |
| **Contour** | VMware | Envoy-based | HTTP/2, gRPC support tốt |
| **AWS ALB Controller** | AWS | EKS | Tích hợp native AWS ALB |
| **GKE Ingress** | Google | GKE | Google Cloud LB integration |
| **Azure AGIC** | Microsoft | AKS | Azure Application Gateway |

```mermaid
graph LR
    subgraph OPEN["🟢 Open Source"]
        N["Nginx\n(community)\nmost popular"]
        T["Traefik\nauto-discover\ndashboard"]
        H["HAProxy\nhigh perf"]
        C["Contour\nEnvoy-based\nHTTP/2 gRPC"]
    end
    subgraph CLOUD["☁️ Cloud Native"]
        AWS["AWS ALB\nController"]
        GKE["GKE Ingress\nGoogle LB"]
        AZ["Azure AGIC\nApp Gateway"]
    end
    subgraph ENT["💼 Enterprise"]
        NE["Nginx Inc\nF5 support"]
    end

    style OPEN fill:#1b5e20,stroke:#66bb6a,color:#fff
    style CLOUD fill:#0d47a1,stroke:#4a9eff,color:#fff
    style ENT fill:#4a148c,stroke:#ce93d8,color:#fff
```

---

## 6. Gateway API — Thế hệ kế tiếp của Ingress

> Gateway API là **next-gen Ingress** — expressive hơn, role-oriented, hỗ trợ cả North-South (Ingress) lẫn East-West (Service Mesh).

```mermaid
flowchart TD
    subgraph COMPARE["Ingress vs Gateway API"]
        subgraph OLD["🔴 Ingress (cũ)"]
            I_OBJ["1 Ingress object\n─────────────────\nHeavy annotations\nLimited routing\nNo traffic weighting\nNo header matching\nCluster-admin only"]
        end

        subgraph NEW["🟢 Gateway API (mới)"]
            GC["GatewayClass\n(Infrastructure Provider)\n─────────────\nDefines LB type"]
            GW["Gateway\n(Cluster Operator)\n─────────────\nDefines access point\nport, protocol, TLS"]
            HR["HTTPRoute\n(App Developer)\n─────────────\nPath/host routing\nHeader matching\nTraffic weighting\nRetries, timeouts"]
            GC --> GW --> HR
        end
    end

    style OLD fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style NEW fill:#1b5e20,stroke:#66bb6a,color:#fff
    style GC fill:#e65100,stroke:#ffb74d,color:#fff
    style GW fill:#0d47a1,stroke:#4a9eff,color:#fff
    style HR fill:#1b5e20,stroke:#66bb6a,color:#fff
```

### 3 Roles trong Gateway API

```mermaid
graph LR
    IAN["🏗️ Infrastructure Provider\n(Ian)\n─────────────────\nGatewayClass\nDefines LB types\navailable in cluster"]
    CHIHIRO["🔧 Cluster Operator\n(Chihiro)\n─────────────────\nGateway\nManages access points\nPorts, TLS, namespaces"]
    ANA["👩‍💻 App Developer\n(Ana)\n─────────────────\nHTTPRoute / GRPCRoute\nDefines routing rules\nTraffic management"]

    IAN -->|"provides"| CHIHIRO
    CHIHIRO -->|"allows"| ANA

    style IAN fill:#4a148c,stroke:#ce93d8,color:#fff
    style CHIHIRO fill:#0d47a1,stroke:#4a9eff,color:#fff
    style ANA fill:#1b5e20,stroke:#66bb6a,color:#fff
```

### YAML Example — Gateway API

```yaml
# GatewayClass (Infrastructure Provider)
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx-gateway
spec:
  controllerName: k8s.nginx.org/nginx-gateway-controller
---
# Gateway (Cluster Operator)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: infra
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: http
      port: 80
      protocol: HTTP
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        certificateRefs:
          - name: example-tls-cert
---
# HTTPRoute (App Developer) — với traffic weighting
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop-route
  namespace: production
spec:
  parentRefs:
    - name: main-gateway
      namespace: infra
  hostnames:
    - "www.example.com"
  rules:
    # Path matching
    - matches:
        - path:
            type: PathPrefix
            value: /shop
      backendRefs:
        - name: shop-svc
          port: 80
          weight: 90      # 90% traffic → stable
        - name: shop-svc-canary
          port: 80
          weight: 10      # 10% → canary version

    # Header-based routing
    - matches:
        - headers:
            - name: X-User-Type
              value: premium
      backendRefs:
        - name: premium-svc
          port: 80
```

### So sánh Ingress vs Gateway API

| Tính năng | Ingress | Gateway API |
|---|:---:|:---:|
| **Traffic weighting** | ❌ (custom annotation) | ✅ native |
| **Header-based routing** | ❌ (custom annotation) | ✅ native |
| **gRPC routing** | ❌ | ✅ GRPCRoute |
| **Cross-namespace** | ❌ | ✅ |
| **Role separation** | ❌ one object | ✅ GatewayClass/Gateway/Route |
| **Service Mesh support** | ❌ | ✅ GAMMA initiative |
| **Retries & timeouts** | ❌ | ✅ |
| **Maturity** | Stable (GA) | Stable (v1.0+) |

---

## 7. Tổng quan kiến trúc hoàn chỉnh

```mermaid
flowchart LR
    USER["🌐 Internet\nwww.example.com"]

    subgraph CLOUD["☁️ Cloud Provider"]
        CLB["Cloud Load Balancer\nExternal IP\nSSL termination"]
    end

    subgraph K8S["☸️ Kubernetes Cluster"]
        subgraph INGRESS_NS["namespace: ingress-nginx"]
            NIC2["🔀 Nginx Ingress\nController Pod\n─────────────\nreads Ingress rules\nproxytraffic"]
            WEBHOOK2["🔒 Admission\nWebhook\nvalidates Ingress"]
        end

        subgraph APP["namespace: production"]
            ING2["📋 Ingress Object\n─────────────\n/shop → shop-svc\n/blog → blog-svc\n/api → api-svc"]

            subgraph SVCS["ClusterIP Services"]
                SH["shop-svc:80"]
                BL["blog-svc:80"]
                AP["api-svc:3000"]
            end

            subgraph PODS["Pods"]
                P1["🟢 shop pods"]
                P2["🟢 blog pods"]
                P3["🟢 api pods"]
            end
        end
    end

    USER --> CLB --> NIC2
    NIC2 -->|"watch"| ING2
    NIC2 -->|"/shop"| SH --> P1
    NIC2 -->|"/blog"| BL --> P2
    NIC2 -->|"/api"| AP --> P3
    K8S_API2["☸️ K8s API"] -->|"validate"| WEBHOOK2

    style CLOUD fill:#e65100,stroke:#ffb74d,color:#fff
    style K8S fill:#0a1929,stroke:#4a9eff,color:#fff
    style INGRESS_NS fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style APP fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style NIC2 fill:#0d47a1,stroke:#4a9eff,color:#fff
```

---

## 8. Commands tham khảo

```bash
# Xem Ingress objects
kubectl get ingress -A
kubectl describe ingress <name> -n <namespace>

# Xem Ingress Controller logs (troubleshoot routing)
kubectl logs -n ingress-nginx \
  deployment/ingress-nginx-controller --tail=100

# Xem nginx.conf được generate
kubectl exec -n ingress-nginx \
  deployment/ingress-nginx-controller -- cat /etc/nginx/nginx.conf

# Test routing
curl -H "Host: www.example.com" http://<node-ip>:<nodeport>/shop

# Xem IngressClass
kubectl get ingressclass

# Port-forward Ingress Controller để test local
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
curl -H "Host: www.example.com" http://localhost:8080/shop
```
