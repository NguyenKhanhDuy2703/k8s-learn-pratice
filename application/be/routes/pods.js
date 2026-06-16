/**
 * routes/pods.js
 * GET /api/pods
 */

const express = require('express');
const router = express.Router();
const { getPods } = require('../services/podsService');

router.get('/', async (req, res) => {
  try {
    const pods = await getPods();
    res.json({ success: true, data: pods });
  } catch (err) {
    console.error('[API] GET /api/pods error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Cannot connect to Kubernetes cluster. Is your kubeconfig configured?',
      detail: err.message,
    });
  }
});

module.exports = router;
