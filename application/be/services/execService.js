/**
 * execService.js
 *
 * Chạy shell command và trả về stdout, stderr, exitCode.
 */

const { exec } = require('child_process');

/**
 * execCommand(command)
 * @param {string} command - lệnh cần chạy
 * @returns {Promise<{ stdout, stderr, exitCode }>}
 */
function execCommand(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 15000, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: err ? (err.code || 1) : 0,
      });
    });
  });
}

module.exports = { execCommand };
