# Kubernetes Objects vs Resources vs Custom Resources

> 📖 Nguồn: [DevOpsCube — Kubernetes Objects Vs Resources Vs Custom Resource](https://devopscube.com/kubernetes-objects-resources/)  
> ✍️ Tác giả: Bibin Wilson | 📅 Mar 8, 2024

![Kubernetes Objects](images/k8s-objects-banner.png)

---

## Tổng quan

```mermaid
mindmap
  root((☸️ Kubernetes))
    Object
      Bất kỳ thứ gì\nuser tạo và lưu trữ
      Lưu trong etcd
      Mô tả bằng YAML/JSON
    Resource
      API endpoint\ntruy cập Object
      HTTP verbs\nGET POST DELETE
      /api/v1/pods
    Custom Resource
      User tự định nghĩa
      Cần CRD + Controller
      Extensible API
    Manifest
      File YAML chứa\n1+ Object specs
      Giới hạn 1MB
```

---

## 1. Kubernetes Object là gì?

**Object** là bất kỳ thứ gì user tạo ra và được Kubernetes lưu trữ — Pod, Deployment, Service, Namespace, Secret, Volume...

### Lưu trữ trong etcd

Mọi Object đều được persist vào **etcd** dưới thư mục `/registry`:

![Objects lưu trong etcd](images/k8s-objects-etcd.png)

```
/registry/pods/default/nginx
/registry/deployments/production/web-app
/registry/services/visualizer/k8s-visualizer-be
```

### Mô tả Object — Object Specification

```yaml
# Pod Object Specification
apiVersion: v1
kind: Pod
metadata:
  name: webserver-pod
spec:
  containers:
    - name: webserver
      image: nginx:latest
      ports:
        - containerPort: 80
```

### Các loại Object native của Kubernetes

| Category | Objects |
|---|---|
| **Workload** | Pods, ReplicaSets, Deployments, StatefulSets, DaemonSets, Jobs, CronJobs, HPA, VPA |
| **Service & Networking** | Services, Ingress, IngressClasses, NetworkPolicies, Endpoints, EndpointSlices |
| **Storage** | PersistentVolumes, PersistentVolumeClaims, StorageClasses |
| **Configuration** | ConfigMaps, Namespaces, ResourceQuotas, LimitRanges, PodDisruptionBudgets |
| **Security** | Secrets, ServiceAccounts, Roles, RoleBindings, ClusterRoles, ClusterRoleBindings |
| **Metadata** | Labels & Selectors, Annotations, Finalizers |

```mermaid
graph TD
    subgraph WL["⚙️ Workload"]
        Pod & Deployment & StatefulSet & DaemonSet & Job & CronJob
    end
    subgraph NET["🌐 Networking"]
        Service & Ingress & NetworkPolicy
    end
    subgraph STORE["💾 Storage"]
        PV["PersistentVolume"] & PVC["PersistentVolumeClaim"] & SC["StorageClass"]
    end
    subgraph SEC["🔐 Security"]
        Secret & ServiceAccount & Role & ClusterRole
    end

    style WL fill:#0d3b6e,stroke:#4a9eff,color:#fff
    style NET fill:#1a3a2a,stroke:#66bb6a,color:#fff
    style STORE fill:#3e2723,stroke:#ff8a65,color:#fff
    style SEC fill:#4a148c,stroke:#ce93d8,color:#fff
```

---

## 2. Common Object Parameters

Mọi Kubernetes Object đều có 4 trường bắt buộc:

```mermaid
graph LR
    subgraph YAML["📄 Kubernetes Object YAML"]
        AV["apiVersion\n─────────────\nv1 / apps/v1\nbatch/v1\nrbac.../v1\nAlpha→Beta→Stable"]
        KI["kind\n─────────────\nPod\nDeployment\nService\nConfigMap..."]
        ME["metadata\n─────────────\nname\nnamespace\nlabels\nannotations\nfinalizers"]
        SP["spec\n─────────────\nDesired state\nContainer config\nVolumes\nSelectors..."]
    end

    AV --- KI --- ME --- SP

    style YAML fill:#0a1929,stroke:#4a9eff,color:#fff
    style AV fill:#0d47a1,stroke:#4a9eff,color:#fff
    style KI fill:#1b5e20,stroke:#66bb6a,color:#fff
    style ME fill:#4a148c,stroke:#ce93d8,color:#fff
    style SP fill:#bf360c,stroke:#ff8a65,color:#fff
```

| Parameter | Mô tả | Ví dụ |
|---|---|---|
| `apiVersion` | Phiên bản API | `v1`, `apps/v1`, `rbac.../v1` |
| `kind` | Loại Object | `Pod`, `Deployment`, `Service` |
| `metadata` | Định danh Object | `name`, `namespace`, `labels`, `annotations` |
| `spec` | Desired state | Container image, ports, volumes, selectors |

---

## 3. Object UID

Mỗi Object được tạo ra có một **UUID duy nhất**:

![Kubernetes Object UUID](images/k8s-objects-uid.png)

```bash
# Xem UID của pod
kubectl describe pod <pod-name> | grep UID

# Hoặc qua JSON
kubectl get pod <pod-name> -o jsonpath='{.metadata.uid}'
```

> **Quy tắc:**
> - Không thể có 2 Pod cùng tên trong cùng namespace
> - Có thể có Pod `webserver` và Deployment `webserver` cùng tồn tại
> - Dùng `labels` + `annotations` nếu cần identifier không unique

---

## 4. Kubernetes Resource là gì?

**Resource** = API endpoint cụ thể để truy cập một Object qua HTTP.

```mermaid
flowchart LR
    USER["👨‍💻 kubectl\nhoặc API client"]
    
    subgraph API["☸️ K8s API Server"]
        EP1["/api/v1/pods"]
        EP2["/api/v1/namespaces"]
        EP3["/api/v1/namespaces/{ns}/pods/{name}"]
        EP4["/apis/apps/v1/deployments"]
    end

    ETCD["🗄️ etcd\nObject storage"]

    USER -->|"GET POST DELETE"| API
    API -->|"persist / retrieve"| ETCD

    style USER fill:#1565c0,stroke:#4a9eff,color:#fff
    style API fill:#0a1929,stroke:#4a9eff,color:#fff
    style ETCD fill:#1b5e20,stroke:#66bb6a,color:#fff
```

### Object vs Resource — luồng kubectl apply

![Kubernetes Objects vs API Resources](images/k8s-objects-vs-api.png)

```
kubectl apply -f pod.yaml
       │
       ▼ YAML → JSON
kubectl client
       │
       ▼ POST /api/v1/namespaces/default/pods
K8s API Server
       │
       ▼ validate + store
etcd /registry/pods/default/pod-name
```

### API Resource endpoints phổ biến

| Endpoint | HTTP Verb | Mô tả |
|---|---|---|
| `/api/v1/namespaces` | GET | Liệt kê tất cả namespace |
| `/api/v1/pods` | GET | Liệt kê tất cả pod (all namespaces) |
| `/api/v1/namespaces/{ns}/pods` | GET / POST | List hoặc tạo pod trong namespace |
| `/api/v1/namespaces/{ns}/pods/{name}` | GET / DELETE | Xem hoặc xóa pod cụ thể |
| `/apis/apps/v1/namespaces/{ns}/deployments` | GET / POST | Quản lý Deployment |

> ⚠️ Phân biệt: "Pod resource" (API endpoint `/api/v1/pods`) ≠ "Pod" (generic term cho workload)

---

## 5. Kubernetes Custom Resource

Khi native K8s Objects không đủ, bạn có thể **tự định nghĩa Resource**.

```mermaid
flowchart TD
    subgraph NATIVE["☸️ Native K8s Resources"]
        P["Pod"] & D["Deployment"] & S["Secret"] & CM["ConfigMap"]
    end

    subgraph CUSTOM["🔧 Custom Resources (CRD)"]
        BK["Backup\napiVersion: devopscube.com/v1"]
        DB["Database\napiVersion: postgres.io/v1"]
        CERT["Certificate\napiVersion: cert-manager.io/v1"]
    end

    subgraph CTRL["🎮 Custom Controllers"]
        BC["Backup Controller\n→ etcd backup → S3"]
        DC["DB Operator\n→ provision database"]
        CC["Cert Manager\n→ issue TLS cert"]
    end

    BK --> BC
    DB --> DC
    CERT --> CC

    style NATIVE fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style CUSTOM fill:#3e2723,stroke:#ff8a65,color:#fdd
    style CTRL fill:#1a3a2a,stroke:#66bb6a,color:#cec
```

### Ví dụ — Custom Resource "Backup"

```yaml
# Custom Resource Definition (CRD) object spec
apiVersion: devopscube.com/v1
kind: Backup
metadata:
  name: my-backup
spec:
  etcdEndpoint: http://etcd:2379
  s3Bucket: my-bucket
  s3Region: us-west-2
```

Khi apply file này:
1. K8s API nhận request, validate theo CRD schema
2. Object được lưu vào etcd
3. **Custom Controller** (do user viết) detect → thực hiện etcd backup → upload S3

> 💡 Ví dụ CRD phổ biến trong thực tế: **ArgoCD** (`Application`, `AppProject`), **Cert-Manager** (`Certificate`), **Prometheus Operator** (`ServiceMonitor`, `PrometheusRule`)

### So sánh 3 khái niệm

```mermaid
graph LR
    subgraph DIFF["Object vs Resource vs Custom Resource"]
        OBJ["📦 Object\n─────────────────\nThực thể được lưu\nvào etcd\nVD: Pod, Deployment\nNamespace, Secret"]
        RES["🔌 Resource\n─────────────────\nAPI endpoint\ntruy cập Object\nVD: /api/v1/pods\n/apis/apps/v1/..."]
        CR["🔧 Custom Resource\n─────────────────\nObject do user\ntự định nghĩa\nCần CRD + Controller\nVD: Backup, Database"]
    end

    OBJ -->|"truy cập qua"| RES
    RES -->|"mở rộng thành"| CR

    style OBJ fill:#0d47a1,stroke:#4a9eff,color:#fff
    style RES fill:#1b5e20,stroke:#66bb6a,color:#fff
    style CR fill:#bf360c,stroke:#ff8a65,color:#fff
```

---

## 6. Kubernetes Manifest

**Manifest** = file YAML chứa một hoặc nhiều Object specifications.

![Kubernetes Manifest Example](images/k8s-manifest-example.png)

```yaml
# Một manifest có thể chứa nhiều Object (ngăn cách bằng ---)
---
apiVersion: v1
kind: Pod
metadata:
  name: webserver-pod
  namespace: production
spec:
  containers:
    - name: nginx
      image: nginx:latest
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: webserver-svc
  namespace: production
spec:
  selector:
    app: webserver
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

```bash
# Apply toàn bộ manifest
kubectl apply -f manifest.yaml

# Apply cả folder
kubectl apply -f ./manifests/

# Dry-run để kiểm tra trước
kubectl apply -f manifest.yaml --dry-run=client
```

**Giới hạn manifest:**
- Mặc định: **1MB** per file
- Không giới hạn số Object trong 1 file, nhưng nên tách nhỏ để dễ quản lý

---

## 7. Liên hệ với project K8s Visualizer

Project này sử dụng đầy đủ các loại Object:

```mermaid
graph TD
    subgraph VIS["namespace: visualizer"]
        subgraph WL2["Workload Objects"]
            BD["Deployment\nk8s-visualizer-be"]
            FD["Deployment\nk8s-visualizer-fe"]
        end
        subgraph NET2["Networking Objects"]
            BS["Service ClusterIP\n:3001"]
            FS["Service NodePort\n:30090"]
        end
        subgraph SEC2["Security Objects"]
            SA2["ServiceAccount\nk8s-visualizer-sa"]
            CR2["ClusterRole\nreader (get/list/watch)"]
            CRB2["ClusterRoleBinding"]
        end
    end

    subgraph ARGO["ArgoCD Custom Resources"]
        APP["Application CRD\nbe-application\nfe-application\nrbac-application"]
        PROJ["AppProject CRD\nvisualizer-project"]
        ROOT["Application CRD\nroot-app"]
    end

    subgraph GATE["OPA Gatekeeper Custom Resources"]
        CT["ConstraintTemplate\nK8sRequireNonRoot"]
        CON2["Constraint\nrequire-non-root"]
    end

    style VIS fill:#0a1929,stroke:#4a9eff,color:#fff
    style ARGO fill:#3e1f00,stroke:#ff8a65,color:#fff
    style GATE fill:#4a148c,stroke:#ce93d8,color:#fff
```

---

## 8. Tóm tắt

| Khái niệm | Định nghĩa | Ví dụ |
|---|---|---|
| **Object** | Thực thể lưu trong etcd, mô tả bằng YAML | `Pod`, `Deployment`, `Secret` |
| **Resource** | API endpoint truy cập Object | `/api/v1/pods`, `/apis/apps/v1/deployments` |
| **Custom Resource** | Object do user định nghĩa qua CRD | `Application` (ArgoCD), `Certificate` (Cert-Manager) |
| **Manifest** | File YAML chứa 1+ Object spec | `deployment.yaml`, `service.yaml` |
| **Object UID** | UUID unique cho mỗi Object | `eccb772b-1508-4d91-b902-86c762f096cf` |
| **apiVersion** | Version của K8s API group | `v1`, `apps/v1`, `argoproj.io/v1alpha1` |
