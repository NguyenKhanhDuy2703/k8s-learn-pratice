/**
 * useClusterData.js
 *
 * Custom hook quản lý toàn bộ data từ cluster:
 * - Fetch nodes, pods, services lúc mount
 * - Kết nối WebSocket và cập nhật pods realtime
 *
 * WebSocket flow:
 *   1. Kết nối tới BE qua socket.io-client
 *   2. Lắng nghe event 'pod_event' từ BE
 *   3. Khi nhận được: ADDED -> thêm pod, MODIFIED -> cập nhật, DELETED -> xoá
 */

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { fetchNodes, fetchPods, fetchServices } from '../api/k8sApi';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function useClusterData() {
  const [nodes, setNodes] = useState([]);
  const [pods, setPods] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting'); // connecting | connected | disconnected

  // --- Fetch initial data ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        // Gọi 3 API song song để tiết kiệm thời gian
        const [n, p, s] = await Promise.all([fetchNodes(), fetchPods(), fetchServices()]);
        setNodes(n);
        setPods(p);
        setServices(s);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch cluster data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- WebSocket: lắng nghe Pod events realtime ---
  useEffect(() => {
    // Tạo Socket.io client kết nối tới BE
    const socket = io(WS_URL, {
      transports: ['websocket'], // ưu tiên websocket, không dùng long-polling
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected to backend');
      setWsStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected from backend');
      setWsStatus('disconnected');
    });

    // Nhận Pod event từ BE: { type: "ADDED"|"MODIFIED"|"DELETED", pod: {...} }
    socket.on('pod_event', ({ type, pod }) => {
      console.log(`[WS] pod_event: ${type} -> ${pod.namespace}/${pod.name}`);

      setPods((prevPods) => {
        if (type === 'ADDED') {
          // Thêm pod mới nếu chưa tồn tại (tránh duplicate)
          const exists = prevPods.some(
            (p) => p.name === pod.name && p.namespace === pod.namespace
          );
          return exists ? prevPods : [...prevPods, pod];
        }

        if (type === 'MODIFIED') {
          // Cập nhật pod đã tồn tại
          return prevPods.map((p) =>
            p.name === pod.name && p.namespace === pod.namespace ? pod : p
          );
        }

        if (type === 'DELETED') {
          // Xoá pod khỏi danh sách
          return prevPods.filter(
            (p) => !(p.name === pod.name && p.namespace === pod.namespace)
          );
        }

        return prevPods;
      });
    });

    // Cleanup: ngắt kết nối khi component unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return { nodes, pods, services, loading, error, wsStatus };
}
