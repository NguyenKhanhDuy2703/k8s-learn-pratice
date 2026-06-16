/**
 * routes/services.js
 * GET /api/services
 */

const express = require('express');
const router = express.Router();
const { getServices } = require('../services/servicesService');

router.get('/', async (req, res) => {
  try {
    const services = await getServices();
    res.json({ success: true, data: services });
  } catch (err) {
    console.error('[API] GET /api/services error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Cannot connect to Kubernetes cluster. Is your kubeconfig configured?',
      detail: err.message,
    });
  }
});

module.exports = router;
