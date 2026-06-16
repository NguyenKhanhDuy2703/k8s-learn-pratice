/**
 * routes/exec.js
 * POST /api/exec
 *
 * Nhận { command: "kubectl get pods -A" } từ FE,
 * chạy trên server và trả về stdout/stderr.
 *
 * Chỉ cho phép lệnh kubectl, helm, k9s để tránh lạm dụng.
 */

const express = require('express');
const router = express.Router();
const { execCommand } = require('../services/execService');

// Whitelist prefix được phép chạy
const ALLOWED_PREFIXES = ['kubectl', 'helm', 'k9s', 'minikube'];

router.post('/', async (req, res) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing command' });
  }

  const trimmed = command.trim();
  const allowed = ALLOWED_PREFIXES.some((p) => trimmed.startsWith(p));

  if (!allowed) {
    return res.status(403).json({
      success: false,
      error: `Command not allowed. Only: ${ALLOWED_PREFIXES.join(', ')}`,
    });
  }

  try {
    const { stdout, stderr, exitCode } = await execCommand(trimmed);
    res.json({ success: true, stdout, stderr, exitCode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
