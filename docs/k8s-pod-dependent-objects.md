# Kubernetes Pod-Dependent Objects

> 📖 Nguồn tổng hợp từ:
> - [Sysdig — Kubernetes ReplicaSets Overview](https://www.sysdig.com/learn-cloud-native/kubernetes-replicasets-overview)
> - [Octopus — Kubernetes Deployment Strategies](https://octopus.com/devops/kubernetes-deployments/)
> - [DevOpsCube — Kubernetes DaemonSet Guide](https://devopscube.com/kubernetes-daemonset/)
> - [DevOpsCube — Kubernetes Jobs and CronJobs](https://devopscube.com/create-kubernetes-jobs-cron-jobs/)

---

## Tại sao cần Pod-Dependent Objects?

Chạy ứng dụng trên **single pod** = **single point of failure**.  
Kubernetes cung cấp các object bọc ngoài Pod để đảm bảo **high availability**, **scaling**, và **lifecycle management**.

```mermaid
graph TD
    subgraph WORKLOAD["☸️ Workload Objects"]
        RS["1️⃣ ReplicaSet\nDuy trì N pod replicas\nluôn chạy"]
        DEP["2️⃣ Deployment\nManages ReplicaSets\nRolling update / Rollback"]
        STS["3️⃣ StatefulSet\nStateful apps\nStable identity + storage"]
        DS["4️⃣ DaemonSet\nMỗi node\nmột pod"]
        JOB["5️⃣ Job\nChạy đến\nkhi hoàn thành"]
        CJ["CronJob\nJob theo\nlịch cron"]
    end

    DEP -->|"manages"| RS
    RS -->|"creates"| POD["🟢 Pod"]
    STS -->|"creates"| POD
    DS -->|"creates"| POD
    JOB -->|"creates"| POD
    CJ -->|"spawns"| JOB

    style WORKLOAD fill:#0a1929,stroke:#4a9eff,color:#fff
    style RS fill:#0d47a1,stroke:#4a9eff,color:#fff
    style DEP fill:#1b5e20,stroke:#66bb6a,color:#fff
    style STS fill:#4a148c,stroke:#ce93d8,color:#fff
    style DS fill:#e65100,stroke:#ffb74d,color:#fff
    style JOB fill:#bf360c,stroke:#ff8a65,color:#fff
    style CJ fill:#37474f,stroke:#90a4ae,color:#fff
    style POD fill:#1565c0,stroke:#4a9eff,color:#fff
```

---

## 1. ReplicaSet

> Đảm bảo **N pod replicas** luôn chạy. Pod crash → tạo lại ngay.

```mermaid
flowchart LR
    subgraph RS_BOX["ReplicaSet — replicas: 3"]
        P1["🟢 Pod-1"] 
        P2["🟢 Pod-2"]
        P3["🟢 Pod-3"]
    end

    RS_CTRL["ReplicaSet Controller\n─────────────────\nWatch: actual vs desired\ndesired=3, actual=3 ✅"]

    RS_CTRL --> RS_BOX

    P2 -->|"💥 crash"| DEAD["❌ Pod-2 dead"]
    DEAD -->|"auto recreate"| P2_NEW["🟢 Pod-2 (new)"]
    RS_CTRL --> P2_NEW

    style RS_BOX fill:#0d3b6e,stroke:#4a9eff,color:#cce
    style RS_CTRL fill:#1b5e20,stroke:#66bb6a,color:#fff
    style DEAD fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style P2_NEW fill:#1b5e20,stroke:#66bb6a,color:#fff
```

### YAML Example

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: my-replicaset
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app-container
          image: my-image:latest
```

### Key fields

| Field | Mô tả |
|---|---|
| `replicas` | Số pod muốn duy trì |
| `selector.matchLabels` | Label để RS nhận diện pod thuộc về mình |
| `template` | Pod spec để tạo pod mới khi thiếu |

### Use Case & Lưu ý

| ✅ Use Case | ⚠️ Hạn chế |
|---|---|
| Stateless app cần HA | Không hỗ trợ rolling update |
| Đảm bảo luôn có đủ số pod | Không rollback được |
| Load balancing qua nhiều pod | **Nên dùng Deployment thay thế** |

---

## 2. Deployment

> Manages ReplicaSets. Hỗ trợ **rolling update**, **rollback**, và **scaling**.

```mermaid
flowchart TD
    subgraph DEP_FLOW["Deployment Lifecycle"]
        V1["📦 ReplicaSet v1\nimage: app:1.0\nreplicas: 3"]
        V2["📦 ReplicaSet v2\nimage: app:2.0\nreplicas: 3"]
        DEP_CTRL["🎮 Deployment Controller"]
    end

    DEP_CTRL -->|"create"| V1
    V1 -->|"kubectl set image / apply"| V2

    subgraph ROLLING["Rolling Update Strategy"]
        S1["app:1.0 🟢🟢🟢"] -->|"step 1"| S2["app:1.0 🟢🟢\napp:2.0 🟢"]
        S2 -->|"step 2"| S3["app:1.0 🟢\napp:2.0 🟢🟢"]
        S3 -->|"step 3"| S4["app:2.0 🟢🟢🟢"]
    end

    V1 --> ROLLING

    style DEP_FLOW fill:#0a1929,stroke:#4a9eff,color:#fff
    style V1 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style V2 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style ROLLING fill:#3e2723,stroke:#ff8a65,color:#fdd
```

### 6 Deployment Strategies

```mermaid
graph LR
    subgraph STRAT["Deployment Strategies"]
        R["🔄 Rolling\nGradual replace\nNo downtime\n(default)"]
        RC["💥 Recreate\nShutdown all\nthen start new\n(downtime ok)"]
        BG["🔵🟢 Blue/Green\n2 environments\nInstant cutover"]
        CA["🐤 Canary\nSmall % traffic\nto new version"]
        AB["⚖️ A/B Testing\n2 versions live\nMetrics comparison"]
        SH["👻 Shadow\nNew version gets\nreal traffic copy"]
    end

    style R fill:#1b5e20,stroke:#66bb6a,color:#fff
    style RC fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style BG fill:#0d47a1,stroke:#4a9eff,color:#fff
    style CA fill:#e65100,stroke:#ffb74d,color:#fff
    style AB fill:#4a148c,stroke:#ce93d8,color:#fff
    style SH fill:#37474f,stroke:#90a4ae,color:#fff
```

> ⚠️ Blue/Green, Canary, A/B, Shadow cần thêm load balancer hoặc service mesh — không có sẵn trong K8s native.

### YAML Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Tối đa thêm 1 pod khi update
      maxUnavailable: 0  # Không cho pod nào down khi update
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-container
          image: my-image:2.0
          ports:
            - containerPort: 80
```

### Commands cơ bản

```bash
# Deploy
kubectl apply -f deployment.yaml

# Update image
kubectl set image deployment/my-deployment my-container=my-image:3.0

# Xem rollout status
kubectl rollout status deployment/my-deployment

# Rollback
kubectl rollout undo deployment/my-deployment

# Scale
kubectl scale deployment my-deployment --replicas=5

# Xem lịch sử revision
kubectl rollout history deployment/my-deployment
```

---

## 3. StatefulSet

> Như Deployment nhưng cho **stateful applications**. Mỗi Pod có **stable identity** và **persistent storage**.

```mermaid
flowchart LR
    subgraph STS_BOX["StatefulSet: mysql"]
        P0["🗄️ mysql-0\nPVC: mysql-data-0\nDNS: mysql-0.mysql"]
        P1["🗄️ mysql-1\nPVC: mysql-data-1\nDNS: mysql-1.mysql"]
        P2["🗄️ mysql-2\nPVC: mysql-data-2\nDNS: mysql-2.mysql"]
    end

    subgraph DIFF["StatefulSet vs Deployment"]
        D1["Deployment Pod\n─────────────\nRandom name\nNo stable DNS\nShared storage\nReplace bất kỳ"]
        D2["StatefulSet Pod\n─────────────\nOrdered name (0,1,2)\nStable DNS\nDedicated PVC\nReplace theo thứ tự"]
    end

    style STS_BOX fill:#4a148c,stroke:#ce93d8,color:#fff
    style P0 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style P1 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style P2 fill:#bf360c,stroke:#ff8a65,color:#fff
    style D1 fill:#37474f,stroke:#90a4ae,color:#fff
    style D2 fill:#4a148c,stroke:#ce93d8,color:#fff
```

### YAML Example

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql        # Headless service name
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: password
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
  volumeClaimTemplates:         # Mỗi pod có PVC riêng
    - metadata:
        name: mysql-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

### So sánh StatefulSet vs Deployment

| Tiêu chí | Deployment | StatefulSet |
|---|---|---|
| Pod names | Random `pod-xyz123` | Ordered `pod-0`, `pod-1` |
| DNS | Không stable | `pod-0.service`, `pod-1.service` |
| Storage | Shared hoặc ephemeral | Dedicated PVC per pod |
| Scale/Delete order | Bất kỳ | Theo thứ tự ngược (2→1→0) |
| Use case | Stateless web/API | Database, Kafka, ZooKeeper |

---

## 4. DaemonSet

![DaemonSet](images/daemonset-banner.png)

> Đảm bảo **mỗi node** trong cluster chạy **đúng một pod**.

```mermaid
flowchart TD
    subgraph CLUSTER["☸️ Kubernetes Cluster"]
        subgraph CP["Control Plane"]
            API["API Server"]
        end
        subgraph WORKERS["Worker Nodes"]
            N1["🖥️ node-1\n🟢 fluentd-pod"]
            N2["🖥️ node-2\n🟢 fluentd-pod"]
            N3["🖥️ node-3\n🟢 fluentd-pod"]
            N4["🖥️ node-4 (new)\n🟢 fluentd-pod (auto)"]
        end
    end

    DS["DaemonSet: fluentd\n────────────────\n1 pod per node\nAuto-add khi có node mới\nAuto-remove khi xóa node"]
    DS --> N1 & N2 & N3 & N4

    style CLUSTER fill:#0a1929,stroke:#4a9eff,color:#fff
    style DS fill:#e65100,stroke:#ffb74d,color:#fff
    style N1 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style N2 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style N3 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style N4 fill:#0d47a1,stroke:#4a9eff,color:#fff
```

### Use Cases

```mermaid
graph LR
    subgraph UC["DaemonSet Use Cases"]
        LOG["📋 Log Collection\nfluentd / logstash\nfluentbit\nMỗi node gom log"]
        MON["📊 Node Monitoring\nPrometheus\nNode Exporter\nNode-level metrics"]
        SEC["🔐 Security\nkube-bench CIS\nIntrusion detection\nVulnerability scanner"]
        NET["🌐 Networking\nCalico CNI\nkube-proxy\nFirewall agent"]
        STORE["💾 Storage\nStorage plugin\ntrên mỗi node"]
    end

    style LOG fill:#0d47a1,stroke:#4a9eff,color:#fff
    style MON fill:#e65100,stroke:#ffb74d,color:#fff
    style SEC fill:#b71c1c,stroke:#ef9a9a,color:#fff
    style NET fill:#1b5e20,stroke:#66bb6a,color:#fff
    style STORE fill:#4a148c,stroke:#ce93d8,color:#fff
```

### YAML Example

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      tolerations:
        # Cho phép chạy trên control plane nếu cần
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
      containers:
        - name: fluentd
          image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
          resources:
            limits:
              memory: 200Mi
            requests:
              cpu: 100m
              memory: 200Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

### Taint & Toleration với DaemonSet

```bash
# Taint node để ngăn DaemonSet schedule
kubectl taint nodes node-1 app=fluentd:NoExecute

# Toleration trong DaemonSet spec để bỏ qua taint
tolerations:
  - key: app
    value: fluentd
    operator: Equal
    effect: NoExecute
```

---

## 5. Job & CronJob

![Kubernetes CronJob](images/k8s-cronjob-banner.png)

> **Job**: chạy Pod đến khi **hoàn thành** (exit code 0).  
> **CronJob**: chạy Job theo **lịch cron**.

```mermaid
flowchart LR
    subgraph JOB_VS_DEP["Job vs Deployment"]
        DEP2["Deployment\n────────────\nChạy liên tục\nRestart khi fail\nNo completion"]
        JOB2["Job\n────────────\nChạy đến xong\nExit code 0 = success\nPod remain after done"]
    end

    subgraph CJ_FLOW["CronJob Flow"]
        SCHED["⏰ CronJob\nschedule: 0 */2 * * *\n(mỗi 2 giờ)"] -->|"tạo"| J1["Job #1"]
        J1 -->|"tạo"| P_J1["Pod\nrun → exit 0 ✅"]
        SCHED -->|"2 giờ sau"| J2["Job #2"]
        J2 -->|"tạo"| P_J2["Pod\nrun → exit 0 ✅"]
    end

    style JOB_VS_DEP fill:#0a1929,stroke:#4a9eff,color:#fff
    style DEP2 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style JOB2 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style CJ_FLOW fill:#3e1f00,stroke:#ff8a65,color:#fff
    style SCHED fill:#e65100,stroke:#ffb74d,color:#fff
```

### YAML — Job đơn giản

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing-job
spec:
  completions: 6      # Cần 6 pod hoàn thành
  parallelism: 2      # Chạy 2 pod song song
  backoffLimit: 3     # Retry tối đa 3 lần nếu fail
  activeDeadlineSeconds: 300  # Timeout 5 phút
  template:
    spec:
      restartPolicy: OnFailure  # Job PHẢI set OnFailure hoặc Never
      containers:
        - name: processor
          image: devopscube/kubernetes-job-demo:latest
          args: ["100"]
```

### YAML — CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-backup
spec:
  schedule: "0 2 * * *"          # Mỗi ngày lúc 2:00 AM
  successfulJobsHistoryLimit: 3   # Giữ 3 job thành công
  failedJobsHistoryLimit: 1       # Giữ 1 job thất bại
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: backup-tool:latest
              args: ["--target=s3://my-bucket"]
```

### Cron Syntax

```
┌─── phút (0-59)
│  ┌─── giờ (0-23)
│  │  ┌─── ngày trong tháng (1-31)
│  │  │  ┌─── tháng (1-12)
│  │  │  │  ┌─── ngày trong tuần (0-6, 0=CN)
│  │  │  │  │
*  *  *  *  *

Ví dụ:
"0 2 * * *"       → Mỗi ngày lúc 2AM
"*/15 * * * *"    → Mỗi 15 phút
"0 9 * * 1"       → Thứ 2 lúc 9AM
"0 0 1 * *"       → Ngày 1 mỗi tháng
```

### Job Parameters quan trọng

| Parameter | Mô tả | Ví dụ |
|---|---|---|
| `completions` | Số pod cần hoàn thành | `6` |
| `parallelism` | Số pod chạy song song | `2` |
| `backoffLimit` | Số lần retry nếu fail | `3` |
| `activeDeadlineSeconds` | Hard timeout | `300` |
| `ttlSecondsAfterFinished` | Tự xóa job sau X giây | `3600` |
| `generateName` | Prefix tên random | `kube-job-` |

### Commands

```bash
# Tạo Job
kubectl apply -f job.yaml

# Theo dõi Job
kubectl get jobs
kubectl describe job data-processing-job

# Xem logs của Job pod
kubectl logs -l job-name=data-processing-job

# Chạy CronJob thủ công (ad-hoc)
kubectl create job --from=cronjob/daily-backup manual-run-$(date +%s)

# Xem lịch sử CronJob
kubectl get cronjobs
kubectl get jobs --sort-by=.metadata.creationTimestamp
```

---

## Tóm tắt so sánh 5 Objects

```mermaid
graph TD
    subgraph COMPARE["So sánh Pod-Dependent Objects"]
        RS2["ReplicaSet\n────────────────\n✅ N replicas always running\n✅ Auto-restart on crash\n❌ No rolling update\n❌ No rollback\n📌 Use: dùng qua Deployment"]

        DEP3["Deployment\n────────────────\n✅ Manages ReplicaSets\n✅ Rolling update\n✅ Rollback\n✅ Scale\n📌 Use: Stateless web/API"]

        STS2["StatefulSet\n────────────────\n✅ Stable pod identity\n✅ Ordered deploy/delete\n✅ Dedicated PVC per pod\n❌ Complex to manage\n📌 Use: DB, Kafka, ZK"]

        DS2["DaemonSet\n────────────────\n✅ 1 pod per node\n✅ Auto-scale with cluster\n✅ NodeSelector support\n❌ Cannot scale per node\n📌 Use: logging, monitoring"]

        JOB3["Job / CronJob\n────────────────\n✅ Run to completion\n✅ Parallel processing\n✅ Scheduled execution\n✅ Auto-retry on fail\n📌 Use: batch, ETL, backup"]
    end

    style RS2 fill:#0d47a1,stroke:#4a9eff,color:#fff
    style DEP3 fill:#1b5e20,stroke:#66bb6a,color:#fff
    style STS2 fill:#4a148c,stroke:#ce93d8,color:#fff
    style DS2 fill:#e65100,stroke:#ffb74d,color:#fff
    style JOB3 fill:#bf360c,stroke:#ff8a65,color:#fff
```

| Object | replicas | Rolling Update | Stable Identity | Run to Complete | Per Node |
|---|:---:|:---:|:---:|:---:|:---:|
| ReplicaSet | ✅ | ❌ | ❌ | ❌ | ❌ |
| Deployment | ✅ | ✅ | ❌ | ❌ | ❌ |
| StatefulSet | ✅ | ✅ | ✅ | ❌ | ❌ |
| DaemonSet | auto | ✅ | ❌ | ❌ | ✅ |
| Job | N/A | N/A | ❌ | ✅ | ❌ |
| CronJob | N/A | N/A | ❌ | ✅ | ❌ |
