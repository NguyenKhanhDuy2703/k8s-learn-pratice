# Phân tích: Kubernetes Kubeconfig File

> 📖 Nguồn: [Kubeconfig File Explained – DevOpsCube](https://devopscube.com/kubernetes-kubeconfig-file/)  
> ✍️ Tác giả: Bibin Wilson | 📅 Cập nhật: May 30, 2025

![Kubeconfig File Explained](images/kubeconfig-file-explained-1.png)

---

## 1. Kubeconfig là gì?

Kubeconfig là một file **YAML** chứa toàn bộ thông tin để `kubectl` xác thực và kết nối tới Kubernetes API Server.

![Kubeconfig cluster access](images/kubeconfig-cluster-access.png)

```mermaid
graph LR
    subgraph KC["📄 Kubeconfig File (~/.kube/config)"]
        C["🖥️ clusters\n─────────────\nendpoint\nCA certificate"]
        U["👤 users\n─────────────\ntoken\ncertificate"]
        X["🔗 contexts\n─────────────\ncluster ↔ user\nmapping"]
        CC["⭐ current-context\n─────────────\nactive context"]
    end

    KC -->|"loadFromDefault()"| API["☸️ K8s API Server"]

    style KC fill:#1e3a5f,stroke:#4a9eff,color:#fff
    style C fill:#0d47a1,stroke:#4a9eff,color:#fff
    style U fill:#0d47a1,stroke:#4a9eff,color:#fff
    style X fill:#0d47a1,stroke:#4a9eff,color:#fff
    style CC fill:#1565c0,stroke:#ffb300,color:#fff
    style API fill:#1b5e20,stroke:#66bb6a,color:#fff
```

> 💡 Không chỉ người dùng — **controller-manager**, **scheduler**, **kubelet** cũng dùng kubeconfig để giao tiếp với API Server. Các file này nằm tại `/etc/kubernetes/` trên control plane node.

---

## 2. Cấu trúc file Kubeconfig

```mermaid
graph TD
    subgraph KF["📄 kubeconfig.yaml"]
        direction TB
        A["apiVersion: v1\nkind: Config"]

        subgraph CL["clusters[]"]
            C1["📡 cluster-name\n───────────────\nserver: https://...\ncertificate-authority-data: ..."]
        end

        subgraph US["users[]"]
            U1["👤 cluster-name-user\n───────────────\ntoken: &lt;secret-token&gt;"]
        end

        subgraph CO["contexts[]"]
            X1["🔗 context-name\n───────────────\ncluster: cluster-name\nuser: cluster-name-user"]
        end

        CC["⭐ current-context: context-name"]
    end

    C1 --- X1
    U1 --- X1
    X1 --- CC

    style KF fill:#0a1929,stroke:#4a9eff,color:#fff
    style CL fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style US fill:#1a3a2a,stroke:#66bb6a,color:#cec
    style CO fill:#3e2723,stroke:#ff8a65,color:#fdd
    style C1 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style U1 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style X1 fill:#bf360c,stroke:#ff8a65,color:#fff
    style CC fill:#4a148c,stroke:#ce93d8,color:#fff
```

### 5 thông tin bắt buộc

| # | Field | Mô tả |
|---|---|---|
| 1 | `certificate-authority-data` | CA certificate của cluster (base64) |
| 2 | `server` | Endpoint API Server (IP hoặc DNS) |
| 3 | `name` | Tên cluster |
| 4 | `user` | Tên user / service account |
| 5 | `token` | Secret token để xác thực |

---

## 3. Thứ tự ưu tiên khi dùng Kubeconfig

```mermaid
flowchart TD
    A["🚀 kubectl command"] --> B{{"Có --kubeconfig\nflag không?"}}
    B -->|"✅ Có"| C["🏆 Dùng file chỉ định\n--kubeconfig=/path/file\n\nƯu tiên CAO NHẤT"]
    B -->|"❌ Không"| D{{"Có biến môi trường\nKUBECONFIG không?"}}
    D -->|"✅ Có"| E["🥈 Dùng file từ env var\nexport KUBECONFIG=...\n\nƯu tiên TRUNG BÌNH"]
    D -->|"❌ Không"| F["🥉 Dùng file mặc định\n~/.kube/config\n\nƯu tiên THẤP NHẤT"]
    C --> G["☸️ K8s API Server"]
    E --> G
    F --> G

    style A fill:#1565c0,stroke:#4a9eff,color:#fff
    style B fill:#4a148c,stroke:#ce93d8,color:#fff
    style C fill:#1b5e20,stroke:#66bb6a,color:#fff
    style D fill:#4a148c,stroke:#ce93d8,color:#fff
    style E fill:#e65100,stroke:#ffb74d,color:#fff
    style F fill:#37474f,stroke:#90a4ae,color:#fff
    style G fill:#0d47a1,stroke:#4a9eff,color:#fff
```

---

## 4. Ba cách sử dụng Kubeconfig

```mermaid
flowchart LR
    subgraph M1["📌 Method 1\nKubectl Context"]
        direction TB
        m1a["mv kubeconfig\n~/.kube/"]
        m1b["kubectl config\nget-contexts"]
        m1c["kubectl config\nuse-context"]
        m1d["kubectl get nodes"]
        m1a --> m1b --> m1c --> m1d
    end

    subgraph M2["🌐 Method 2\nEnv Variable"]
        direction TB
        m2a["export KUBECONFIG=\n$HOME/.kube/dev_config"]
        m2b["kubectl get nodes"]
        m2a --> m2b
    end

    subgraph M3["⚡ Method 3\nInline Flag"]
        direction TB
        m3a["kubectl get nodes\n--kubeconfig=\n/path/to/config"]
        m3b["✅ Done"]
        m3a --> m3b
    end

    M1 -->|"🏠 Local dev\nthường dùng nhất"| API["☸️ K8s API"]
    M2 -->|"🔀 Multi-cluster\nswitch nhanh"| API
    M3 -->|"🤖 CI/CD\nisolation"| API

    style M1 fill:#0d3b6e,stroke:#4a9eff,color:#fff
    style M2 fill:#1a3a2a,stroke:#66bb6a,color:#fff
    style M3 fill:#3e1f00,stroke:#ff8a65,color:#fff
    style API fill:#4a148c,stroke:#ce93d8,color:#fff
```

---

## 5. Merge nhiều Kubeconfig

```mermaid
flowchart LR
    subgraph INPUT["📂 ~/.kube/"]
        F1["📄 config\n(default)"]
        F2["📄 dev_config"]
        F3["📄 test_config"]
    end

    MERGE["🔀 KUBECONFIG=config:dev_config:test_config\nkubectl config view --merge --flatten > config.new"]

    F1 --> MERGE
    F2 --> MERGE
    F3 --> MERGE

    MERGE --> NEW["📄 config.new\n(merged)"]
    NEW -->|"mv config.new config"| OUT["📄 config\n✅ All contexts merged"]

    style INPUT fill:#0a1929,stroke:#4a9eff,color:#fff
    style F1 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style F2 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style F3 fill:#bf360c,stroke:#ff8a65,color:#fff
    style MERGE fill:#4a148c,stroke:#ce93d8,color:#fff
    style NEW fill:#37474f,stroke:#90a4ae,color:#fff
    style OUT fill:#1b5e20,stroke:#66bb6a,color:#fff
```

---

## 6. Tạo Kubeconfig tùy chỉnh (ServiceAccount)

Dùng khi cần cấp quyền truy cập cluster cho developer với **quyền hạn chế**.

```mermaid
flowchart TD
    S1["1️⃣ Tạo ServiceAccount\nkubectl create serviceaccount\ndevops-cluster-admin"]
    S2["2️⃣ Tạo Secret\ntype: kubernetes.io/\nservice-account-token\n📌 K8s ≥ 1.24 cần tạo riêng"]
    S3["3️⃣ Tạo ClusterRole\nrules: get/list/watch\nnodes, pods, services\ningresses"]
    S4["4️⃣ Tạo ClusterRoleBinding\nSA ──bind──► ClusterRole"]
    S5["5️⃣ Lấy thông tin\nSA_SECRET_TOKEN\nCLUSTER_NAME\nCLUSTER_ENDPOINT\nCLUSTER_CA_CERT"]
    S6["6️⃣ Generate Kubeconfig\ncat > devops-cluster-admin-config"]
    S7["7️⃣ Validate\nkubectl get nodes\n--kubeconfig=..."]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7

    S7 -->|"✅ Success"| DONE["🎉 Kubeconfig sẵn sàng\ncấp cho developer"]
    S7 -->|"❌ Error"| FIX["🔧 Check\nRBAC / Token / Endpoint"]

    style S1 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style S2 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style S3 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style S4 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style S5 fill:#4a148c,stroke:#ce93d8,color:#fff
    style S6 fill:#bf360c,stroke:#ff8a65,color:#fff
    style S7 fill:#e65100,stroke:#ffb74d,color:#fff
    style DONE fill:#1b5e20,stroke:#66bb6a,color:#fff
    style FIX fill:#b71c1c,stroke:#ef9a9a,color:#fff
```

### Ví dụ tạo ServiceAccount có quyền đọc cluster

```bash
# 1. Tạo ServiceAccount
kubectl -n kube-system create serviceaccount devops-cluster-admin

# 2. Tạo Secret (K8s >= 1.24 cần tạo riêng)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: devops-cluster-admin-secret
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: devops-cluster-admin
type: kubernetes.io/service-account-token
EOF

# 3. Tạo ClusterRole (chỉ get/list/watch)
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: devops-cluster-admin
rules:
  - apiGroups: [""]
    resources: [nodes, pods, services, endpoints]
    verbs: [get, list, watch]
  - apiGroups: [extensions]
    resources: [ingresses]
    verbs: [get, list, watch]
EOF

# 4. ClusterRoleBinding
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: devops-cluster-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: devops-cluster-admin
subjects:
  - kind: ServiceAccount
    name: devops-cluster-admin
    namespace: kube-system
EOF

# 5. Lấy thông tin cluster
export SA_SECRET_TOKEN=$(kubectl -n kube-system get secret/devops-cluster-admin-secret \
  -o=go-template='{{.data.token}}' | base64 --decode)
export CLUSTER_NAME=$(kubectl config current-context)
export CLUSTER_ENDPOINT=$(kubectl config view --raw \
  -o=go-template='{{range .clusters}}{{if eq .name "'''${CLUSTER_NAME}'''"}}{{ .cluster.server }}{{end}}{{end}}')
export CLUSTER_CA_CERT=$(kubectl config view --raw \
  -o=go-template='{{range .clusters}}{{if eq .name "'''${CLUSTER_NAME}'''"}}{{ index .cluster "certificate-authority-data" }}{{end}}{{end}}')

# 6. Generate kubeconfig
cat <<EOF > devops-cluster-admin-config
apiVersion: v1
kind: Config
current-context: ${CLUSTER_NAME}
contexts:
  - name: ${CLUSTER_NAME}
    context:
      cluster: ${CLUSTER_NAME}
      user: devops-cluster-admin
clusters:
  - name: ${CLUSTER_NAME}
    cluster:
      certificate-authority-data: ${CLUSTER_CA_CERT}
      server: ${CLUSTER_ENDPOINT}
users:
  - name: devops-cluster-admin
    user:
      token: ${SA_SECRET_TOKEN}
EOF

# 7. Validate
kubectl get nodes --kubeconfig=devops-cluster-admin-config
```

---

## 7. Xóa Context khỏi Kubeconfig

```mermaid
flowchart LR
    A["📋 List contexts\nkubectl config\nget-contexts -o=name"] --> B["🗑️ Delete context\nkubectl config\ndelete-context name"]
    B --> C["🔀 Switch context\nkubectl config\nuse-context name"]
    C --> D["✅ Cluster mới\nđang active"]

    style A fill:#0d47a1,stroke:#4a9eff,color:#fff
    style B fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style C fill:#e65100,stroke:#ffb74d,color:#fff
    style D fill:#1b5e20,stroke:#66bb6a,color:#fff
```

---

## 8. Security Best Practices

```mermaid
graph TD
    ROOT["🔐 Kubeconfig Security"]

    ROOT --> P["📁 File Permissions\nchmod 600 ~/.kube/config\nchmod 700 ~/.kube\nchown -R \$USER ~/.kube"]
    ROOT --> G["🚫 Git Protection\necho /.kube/ >> .gitignore\necho kubeconfig* >> .gitignore"]
    ROOT --> SA["👤 Least Privilege\nDùng ServiceAccount\nthay vì admin token"]
    ROOT --> ROT["🔄 Token Rotation\nRotate token định kỳ\nGiảm thiệt hại nếu lộ"]
    ROOT --> OIDC["🏢 Production\nDùng OIDC / IAM\nAudit log đầy đủ"]

    P --> WARN["⚠️ Nếu vi phạm:\nWARNING: config file\nis group-readable"]
    SA --> OK["✅ Principle of\nLeast Privilege"]
    OIDC --> OK2["✅ Enterprise\nSecurity Standard"]

    style ROOT fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style P fill:#0d47a1,stroke:#4a9eff,color:#fff
    style G fill:#1b5e20,stroke:#66bb6a,color:#fff
    style SA fill:#4a148c,stroke:#ce93d8,color:#fff
    style ROT fill:#e65100,stroke:#ffb74d,color:#fff
    style OIDC fill:#37474f,stroke:#90a4ae,color:#fff
    style WARN fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style OK fill:#1b5e20,stroke:#66bb6a,color:#fff
    style OK2 fill:#1b5e20,stroke:#66bb6a,color:#fff
```

### Bảng tổng hợp

| ✅ Thực hành | 🎯 Lý do |
|---|---|
| `chmod 600 ~/.kube/config` | Chặn người khác đọc token/cert |
| Không commit kubeconfig lên Git | Token bị lộ = mất cluster |
| Dùng ServiceAccount thay vì admin token | Principle of least privilege |
| Rotate token định kỳ | Giảm thiệt hại nếu bị lộ |
| Dùng OIDC trong production | Tích hợp IAM, có audit log |
| `proxy-url` trong kubeconfig | Hoạt động sau corporate firewall |

---

## 9. Liên hệ với project K8s Visualizer

```mermaid
flowchart LR
    subgraph POD["☸️ Pod: k8s-visualizer-be"]
        APP["🟢 Express.js App"]
        SA_TOKEN["🔑 ServiceAccount Token\n/var/run/secrets/\nkubernetes.io/serviceaccount/"]
    end

    subgraph RBAC["🛡️ RBAC"]
        SA["👤 k8s-visualizer-sa"]
        CR["📋 ClusterRole\nk8s-visualizer-reader\n─────────────────\nget/list/watch:\nnodes, pods\nservices, namespaces"]
        CRB["🔗 ClusterRoleBinding"]
        SA --> CRB --> CR
    end

    APP -->|"kc.loadFromDefault()\n(in-cluster auto-detect)"| SA_TOKEN
    SA_TOKEN -->|"Bearer Token"| API["☸️ K8s API Server"]
    CR -->|"authorize"| API

    API -->|"nodes, pods\nservices data"| APP

    style POD fill:#0d3b6e,stroke:#4a9eff,color:#fff
    style RBAC fill:#1a3a2a,stroke:#66bb6a,color:#fff
    style APP fill:#0d47a1,stroke:#4a9eff,color:#fff
    style SA_TOKEN fill:#4a148c,stroke:#ce93d8,color:#fff
    style SA fill:#1b5e20,stroke:#66bb6a,color:#fff
    style CR fill:#1b5e20,stroke:#66bb6a,color:#fff
    style CRB fill:#1b5e20,stroke:#66bb6a,color:#fff
    style API fill:#bf360c,stroke:#ff8a65,color:#fff
```

---

## 10. Tóm tắt tổng quan

```mermaid
mindmap
  root((☸️ Kubeconfig))
    📄 Cấu trúc
      clusters
        endpoint
        CA cert
      users
        token
        certificate
      contexts
        cluster + user mapping
      current-context
    🔌 Cách dùng
      Method 1
        kubectl context
        Phổ biến nhất
      Method 2
        KUBECONFIG env
        Multi-cluster
      Method 3
        --kubeconfig flag
        CI/CD pipeline
    🏗️ Tạo custom
      ServiceAccount
      Secret
      ClusterRole
      ClusterRoleBinding
      Generate YAML
    🔐 Bảo mật
      chmod 600
      gitignore
      Least Privilege
      OIDC / IAM
      Token Rotation
```
