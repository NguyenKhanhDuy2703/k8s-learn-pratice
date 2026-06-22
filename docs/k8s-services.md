# Kubernetes Services — Giải thích trực quan

> 📖 Nguồn tổng hợp từ:
> - [KodeKloud — ClusterIP vs NodePort vs LoadBalancer](https://kodekloud.com/blog/clusterip-nodeport-loadbalancer/)
> - [vCluster — A Clear and Complete Guide to Kubernetes Services](https://www.vcluster.com/blog/a-clear-and-complete-guide-to-kubernetes-services)
> - [Medium — Kubernetes Services Simply Visually Explained](https://medium.com/swlh/kubernetes-services-simply-visually-explained-2d84e58d70e5)

---

## Tại sao cần Service?

Pod IP không ổn định — Pod bị xóa/restart sẽ có IP mới. Client không thể track được.

```mermaid
flowchart LR
    CLIENT["👤 Client\ncần kết nối\nvào app"]

    subgraph WITHOUT["❌ Không có Service"]
        P1A["Pod IP: 10.1.0.5\n(today)"]
        P1B["Pod IP: 10.1.0.99\n(after restart)"]
        P1A -->|"💥 crash → new IP"| P1B
    end

    subgraph WITH["✅ Có Service"]
        SVC["Service\nIP: 10.96.0.10\n(stable forever)"]
        P2A["Pod-1"]
        P2B["Pod-2"]
        P2C["Pod-3"]
        SVC -->|"load balance"| P2A & P2B & P2C
    end

    CLIENT -->|"❌ IP thay đổi\nkhông biết gọi đâu"| WITHOUT
    CLIENT -->|"✅ Luôn gọi\ncùng 1 địa chỉ"| SVC

    style WITHOUT fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style WITH fill:#1b5e20,stroke:#66bb6a,color:#fff
    style SVC fill:#0d47a1,stroke:#4a9eff,color:#fff
```

**Service** cung cấp:
- **Stable IP + DNS name** bất kể Pod restart
- **Load balancing** tự động đến các Pod phía sau
- **Service discovery** qua DNS: `<service>.<namespace>.svc.cluster.local`

---

## Tổng quan 4 loại Service

```mermaid
graph TD
    subgraph TYPES["☸️ Kubernetes Service Types"]
        CIP["1️⃣ ClusterIP\n─────────────────\nInternal only\nPod ↔ Pod\nDefault type"]
        NP["2️⃣ NodePort\n─────────────────\nExternal access\nqua Node IP:Port\nPort 30000-32767"]
        LB["3️⃣ LoadBalancer\n─────────────────\nCloud LB\nExternal IP\nHA production"]
        EN["4️⃣ ExternalName\n─────────────────\nCNAME alias\nTrỏ ra ngoài cluster\nno proxy"]
    end

    CIP -->|"builds on"| NP
    NP -->|"builds on"| LB

    style CIP fill:#0d47a1,stroke:#4a9eff,color:#fff
    style NP fill:#1b5e20,stroke:#66bb6a,color:#fff
    style LB fill:#e65100,stroke:#ffb74d,color:#fff
    style EN fill:#4a148c,stroke:#ce93d8,color:#fff
```

---

## 1. ClusterIP — Internal Communication

> Loại **mặc định**. Chỉ accessible **bên trong cluster**. Pod ↔ Pod.

```mermaid
flowchart LR
    subgraph CLUSTER["☸️ Kubernetes Cluster"]
        subgraph NS_FRONT["namespace: frontend"]
            FE["⚛️ Frontend Pod\n10.1.0.10"]
        end

        subgraph NS_BACK["namespace: backend"]
            SVC["🔷 Service: backend-svc\nClusterIP: 10.96.0.50\nDNS: backend-svc.backend\n.svc.cluster.local"]
            B1["🟢 backend-pod-1\n10.1.1.10"]
            B2["🟢 backend-pod-2\n10.1.1.11"]
            B3["🟢 backend-pod-3\n10.1.1.12"]
            SVC -->|"round-robin"| B1 & B2 & B3
        end

        FE -->|"curl backend-svc.backend\n.svc.cluster.local:3001"| SVC
    end

    INTERNET["🌐 Internet"] -->|"❌ Cannot access\nClusterIP"| CLUSTER

    style CLUSTER fill:#0a1929,stroke:#4a9eff,color:#fff
    style NS_FRONT fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style NS_BACK fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style SVC fill:#0d47a1,stroke:#4a9eff,color:#fff
    style INTERNET fill:#b71c1c,stroke:#ef9a9a,color:#fff
```

### YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-svc
  namespace: backend
spec:
  type: ClusterIP       # Mặc định, có thể bỏ qua
  selector:
    app: backend        # Match pods có label này
  ports:
    - name: http
      port: 3001        # Port của Service
      targetPort: 3001  # Port của Pod
      protocol: TCP
```

### DNS Resolution

```bash
# Từ bất kỳ Pod nào trong cluster
curl backend-svc.backend.svc.cluster.local:3001

# Trong cùng namespace, có thể viết tắt
curl backend-svc:3001

# Xem ClusterIP được gán
kubectl get svc backend-svc
```

---

## 2. NodePort — External Access qua Node

> Expose service ra ngoài cluster bằng cách **mở port trên tất cả Node**.

```mermaid
flowchart LR
    BROWSER["🌐 External Client\nbrowser / curl"]

    subgraph CLUSTER2["☸️ Kubernetes Cluster"]
        subgraph NODE1["🖥️ Node-1\nIP: 192.168.1.10"]
            NP1["NodePort\n:30090"]
        end
        subgraph NODE2["🖥️ Node-2\nIP: 192.168.1.11"]
            NP2["NodePort\n:30090"]
        end
        subgraph NODE3["🖥️ Node-3\nIP: 192.168.1.12"]
            NP3["NodePort\n:30090"]
        end

        CIP2["🔷 ClusterIP\n(auto-created)\n10.96.0.20:80"]
        P_A["🟢 Pod-A\n:80"]
        P_B["🟢 Pod-B\n:80"]

        NP1 & NP2 & NP3 --> CIP2
        CIP2 -->|"load balance"| P_A & P_B
    end

    BROWSER -->|"192.168.1.10:30090\n(hoặc bất kỳ node nào)"| NP1

    style CLUSTER2 fill:#0a1929,stroke:#4a9eff,color:#fff
    style NODE1 fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style NODE2 fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style NODE3 fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style CIP2 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style BROWSER fill:#1565c0,stroke:#4a9eff,color:#fff
```

### YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - name: http
      port: 80          # ClusterIP port (Pod-to-Pod)
      targetPort: 80    # Port trên Pod
      nodePort: 30090   # Port trên Node (30000-32767)
                        # Bỏ qua để K8s tự assign
      protocol: TCP
```

### Traffic flow

```
External Client
    │ 192.168.1.10:30090
    ▼
Node (bất kỳ)
    │ NodePort :30090
    ▼
ClusterIP Service (auto-created)
    │ round-robin
    ▼
Pod :80
```

> ⚠️ **Hạn chế NodePort:**
> - Không có load balancing giữa các Node — client chọn Node nào thì traffic vào Node đó
> - Port range bị giới hạn: `30000–32767`
> - Dùng cho **dev/testing**, không khuyến nghị production

---

## 3. LoadBalancer — Cloud-Native External Access

> **Tự động tạo Cloud Load Balancer** (AWS ALB/NLB, GCP LB, Azure LB). Có external IP duy nhất.

```mermaid
flowchart LR
    USERS["🌐 Internet\nUsers"]

    subgraph CLOUD["☁️ Cloud Provider (AWS/GCP/Azure)"]
        LB_EXT["🔶 Cloud Load Balancer\nExternal IP: 54.123.45.67\n─────────────────────\nHealth checks\nSSL termination\nDistributes across nodes"]
    end

    subgraph CLUSTER3["☸️ Kubernetes Cluster"]
        subgraph NODE_A["🖥️ Node-1"]
            NP_A["NodePort :31000"]
        end
        subgraph NODE_B["🖥️ Node-2"]
            NP_B["NodePort :31000"]
        end
        subgraph NODE_C["🖥️ Node-3"]
            NP_C["NodePort :31000"]
        end
        CIP3["🔷 ClusterIP\n(auto)"]
        P_X["🟢 Pod"]
        P_Y["🟢 Pod"]

        NP_A & NP_B & NP_C --> CIP3
        CIP3 --> P_X & P_Y
    end

    USERS -->|"54.123.45.67:80"| LB_EXT
    LB_EXT -->|"healthy nodes\nonly"| NODE_A & NODE_B & NODE_C

    style CLOUD fill:#e65100,stroke:#ffb74d,color:#fff
    style LB_EXT fill:#bf360c,stroke:#ff8a65,color:#fff
    style CLUSTER3 fill:#0a1929,stroke:#4a9eff,color:#fff
    style USERS fill:#1565c0,stroke:#4a9eff,color:#fff
```

### YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-svc
  annotations:
    # AWS specific — tạo NLB thay vì CLB
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
```

### Traffic flow

```
Internet User
    │ 54.123.45.67:80
    ▼
Cloud Load Balancer  ← health check, SSL, distribute
    │ balanced across nodes
    ▼
Node (NodePort :31000)  ← auto-created
    │
    ▼
ClusterIP Service  ← auto-created
    │ round-robin
    ▼
Pod :8080
```

> ⚠️ **Lưu ý:** Mỗi LoadBalancer Service tạo ra **1 Cloud LB riêng** → **tốn tiền**.  
> Dùng **Ingress + 1 LoadBalancer** để expose nhiều service qua 1 IP.

---

## 4. ExternalName — CNAME Alias ra ngoài

> Không proxy traffic. Chỉ trả về **CNAME DNS record** trỏ ra service bên ngoài cluster.

```mermaid
flowchart LR
    subgraph CLUSTER4["☸️ Kubernetes Cluster"]
        APP["📦 App Pod"]
        SVC_EN["🔷 Service: external-db\ntype: ExternalName\nexternalName:\ndb.prod.example.com"]
    end

    subgraph OUTSIDE["🌐 External"]
        DB["🗄️ RDS Database\ndb.prod.example.com"]
    end

    APP -->|"curl external-db\n.default.svc.cluster.local"| SVC_EN
    SVC_EN -->|"CNAME → db.prod.example.com\n(DNS redirect, no proxy)"| DB

    style CLUSTER4 fill:#0a1929,stroke:#4a9eff,color:#fff
    style SVC_EN fill:#4a148c,stroke:#ce93d8,color:#fff
    style OUTSIDE fill:#1a3a2a,stroke:#66bb6a,color:#fff
```

### YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
  namespace: production
spec:
  type: ExternalName
  externalName: db.prod.example.com  # Hostname bên ngoài
  # Không cần selector, không có ClusterIP
```

### Use Cases

```bash
# App trong cluster gọi external service bằng tên ngắn
curl external-db.production.svc.cluster.local:5432

# Khi migrate DB: chỉ cần đổi externalName, không cần sửa code
# external-db → old-db.prod.com  (before)
# external-db → new-db.prod.com  (after migration)
```

---

## 5. Headless Service

> `clusterIP: None` — Không có virtual IP. DNS trả về **trực tiếp IP của từng Pod**.

```mermaid
flowchart LR
    subgraph NORMAL["ClusterIP thường"]
        DNS1["DNS: mysql-svc\n→ 10.96.0.50 (VIP)"]
        VIP["Virtual IP\n10.96.0.50"]
        VIP --> M1["mysql-0"] & M2["mysql-1"]
    end

    subgraph HEADLESS["Headless Service"]
        DNS2["DNS: mysql-headless\n→ 10.1.0.5, 10.1.0.6"]
        DNS2 --> H1["mysql-0\n10.1.0.5"]
        DNS2 --> H2["mysql-1\n10.1.0.6"]
    end

    style NORMAL fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style HEADLESS fill:#4a148c,stroke:#ce93d8,color:#dce
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-headless
spec:
  clusterIP: None       # Headless!
  selector:
    app: mysql
  ports:
    - port: 3306
```

> 💡 **StatefulSet** dùng Headless Service để tạo DNS ổn định cho từng Pod:
> `mysql-0.mysql-headless.default.svc.cluster.local`

---

## 6. Ingress — Kết hợp với Service

> **Ingress** không phải Service type, nhưng thường dùng với ClusterIP để expose nhiều service qua **1 external IP**.

```mermaid
flowchart LR
    USERS2["🌐 Internet"]

    subgraph CLOUD2["☁️ Cloud"]
        LB2["1️⃣ LoadBalancer\n1 external IP\n(cheapest option)"]
    end

    subgraph CLUSTER5["☸️ Kubernetes Cluster"]
        IC["2️⃣ Ingress Controller\nnginx / traefik\n─────────────────\npath routing\nTLS termination\nhost-based routing"]

        subgraph SVCS["ClusterIP Services"]
            S_A["🔷 api-svc\napp: api"]
            S_B["🔷 web-svc\napp: web"]
            S_C["🔷 admin-svc\napp: admin"]
        end

        P_API["🟢 API Pods"]
        P_WEB["🟢 Web Pods"]
        P_ADM["🟢 Admin Pods"]

        S_A --> P_API
        S_B --> P_WEB
        S_C --> P_ADM
    end

    USERS2 -->|"api.example.com\n/api/*"| LB2
    LB2 --> IC
    IC -->|"/api → api-svc"| S_A
    IC -->|"/ → web-svc"| S_B
    IC -->|"/admin → admin-svc"| S_C

    style CLOUD2 fill:#e65100,stroke:#ffb74d,color:#fff
    style CLUSTER5 fill:#0a1929,stroke:#4a9eff,color:#fff
    style IC fill:#1565c0,stroke:#4a9eff,color:#fff
    style SVCS fill:#1a3a2a,stroke:#66bb6a,color:#cec
```

---

## 7. Tổng quan so sánh

```mermaid
graph TD
    Q1{{"Từ đâu truy cập?"}}

    Q1 -->|"Chỉ trong cluster\n(Pod ↔ Pod)"| CIP_ANS["✅ ClusterIP\nDefault, simple\nDNS: svc.ns.svc.cluster.local"]

    Q1 -->|"Từ ngoài cluster"| Q2{{"Môi trường?"}}

    Q2 -->|"On-premise\nDev/Test"| NP_ANS["✅ NodePort\nPort 30000-32767\nNode_IP:nodePort"]

    Q2 -->|"Cloud Provider\nProduction"| Q3{{"Nhiều services?"}}

    Q3 -->|"1 service, đơn giản"| LB_ANS["✅ LoadBalancer\n1 Cloud LB per service\nExternal IP tự động"]

    Q3 -->|"Nhiều services\ntiết kiệm chi phí"| ING_ANS["✅ Ingress +\nClusterIP\n1 LB cho tất cả\nPath/Host routing"]

    Q1 -->|"Trỏ đến\nexternal service"| EN_ANS["✅ ExternalName\nCNAME alias\nNo proxy"]

    style Q1 fill:#4a148c,stroke:#ce93d8,color:#fff
    style Q2 fill:#4a148c,stroke:#ce93d8,color:#fff
    style Q3 fill:#4a148c,stroke:#ce93d8,color:#fff
    style CIP_ANS fill:#0d47a1,stroke:#4a9eff,color:#fff
    style NP_ANS fill:#1b5e20,stroke:#66bb6a,color:#fff
    style LB_ANS fill:#e65100,stroke:#ffb74d,color:#fff
    style ING_ANS fill:#bf360c,stroke:#ff8a65,color:#fff
    style EN_ANS fill:#37474f,stroke:#90a4ae,color:#fff
```

### Bảng so sánh

| | ClusterIP | NodePort | LoadBalancer | ExternalName |
|---|:---:|:---:|:---:|:---:|
| **Accessible từ** | Inside cluster | External | External | Inside cluster |
| **External IP** | ❌ | Node IPs | ✅ Cloud IP | ❌ |
| **Load balancing (Pods)** | ✅ | ✅ | ✅ | ❌ |
| **Load balancing (Nodes)** | N/A | ❌ | ✅ | N/A |
| **Cloud required** | ❌ | ❌ | ✅ | ❌ |
| **Cost** | Free | Free | 💰 Per LB | Free |
| **Production ready** | ✅ | Dev/Test | ✅ | ✅ |
| **Port range limit** | ❌ | 30000-32767 | ❌ | ❌ |

---

## 8. Liên hệ project K8s Visualizer

```mermaid
flowchart LR
    subgraph VIS["namespace: visualizer"]
        FE_SVC["🔷 k8s-visualizer-fe\ntype: NodePort\nport: 80\nnodePort: 30090"]
        BE_SVC["🔷 k8s-visualizer-be\ntype: ClusterIP\nport: 3001"]
        FE_POD["⚛️ React App\n(nginx)"]
        BE_POD["🟢 Express.js\n:3001"]
    end

    USER["🌐 Browser"] -->|"<Node_IP>:30090"| FE_SVC
    FE_SVC --> FE_POD
    FE_POD -->|"ClusterIP\nk8s-visualizer-be:3001"| BE_SVC
    BE_SVC --> BE_POD
    PROM["📊 Prometheus"] -->|"Pod IP:3001/metrics\n(annotation discovery)"| BE_POD

    style VIS fill:#0a1929,stroke:#4a9eff,color:#fff
    style FE_SVC fill:#1b5e20,stroke:#66bb6a,color:#fff
    style BE_SVC fill:#0d47a1,stroke:#4a9eff,color:#fff
    style PROM fill:#e65100,stroke:#ffb74d,color:#fff
```

| Service | Type | Lý do |
|---|---|---|
| `k8s-visualizer-fe` | NodePort :30090 | Expose UI ra ngoài để browser truy cập |
| `k8s-visualizer-be` | ClusterIP :3001 | Chỉ FE cần gọi BE, không expose ra ngoài |

> 💡 Trong production thực tế nên đổi sang **Ingress + ClusterIP** cho cả FE và BE — tận dụng TLS termination và domain routing.

---

## Commands tham khảo

```bash
# Xem tất cả services
kubectl get svc -A

# Chi tiết một service
kubectl describe svc <service-name> -n <namespace>

# Test ClusterIP từ bên trong cluster
kubectl run test --image=curlimages/curl -it --rm -- curl <svc-name>:<port>

# Test NodePort từ bên ngoài
curl <node-ip>:<nodePort>

# Xem endpoint thực của service (pod IPs)
kubectl get endpoints <service-name>

# Port-forward để test local (không cần expose)
kubectl port-forward svc/<service-name> 8080:80
```
