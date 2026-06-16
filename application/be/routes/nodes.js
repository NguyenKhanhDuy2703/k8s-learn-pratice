/**
 * routes/nodes.js
 * GET /api/nodes
 */

const express = require('express');
const router = express.Router();
const { getNodes } = require('../services/nodesService');

router.get('/', async (req, res) => {
  try {
    const nodes = await getNodes();
    res.json({ success: true, data: nodes });
  } catch (err) {
    // Lỗi thường gặp: ECONNREFUSED (cluster chưa chạy), certificate error
    console.error('[API] GET /api/nodes error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Cannot connect to Kubernetes cluster. Is your kubeconfig configured?',
      detail: err.message,
    });
  }
});

module.exports = router;
