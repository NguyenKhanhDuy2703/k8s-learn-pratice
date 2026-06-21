/**
 * routes/metrics.js
 *
 * GET /metrics
 *
 * Endpoint Prometheus-compatible: trả về metrics của K8s cluster
 * theo chuẩn Prometheus text exposition format (version 0.0.4).
 *
 * Cấu hình Prometheus scrape job ví dụ:
 *
 *   scrape_configs:
 *     - job_name: 'k8s-visualizer'
 *       static_configs:
 *         - targets: ['<backend-service>:3001']
 *       metrics_path: /metrics
 */

const express = require('express');
const router = express.Router();
const { collectMetrics } = require('../services/metricsService');

router.get('/', async (req, res) => {
  try {
    const metricsText = await collectMetrics();

    // Prometheus yêu cầu Content-Type này để parse đúng text format
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(metricsText);
  } catch (err) {
    console.error('[API] GET /metrics error:', err.message);
    res.status(500).send(`# ERROR: ${err.message}\n`);
  }
});

module.exports = router;
