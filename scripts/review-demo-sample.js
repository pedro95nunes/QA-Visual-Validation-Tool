// scripts/review-demo-sample.js
// Intentional demo file: contains real, planted bugs so the Code Review
// workflow has something concrete to flag on the PR. NOT meant to be merged.

const { execSync } = require('child_process');

// BUG (security): builds a shell command from caller-supplied input,
// allowing command injection (e.g. userLabel = "x; rm -rf /").
function screenshotName(userLabel) {
  return execSync('echo ' + userLabel).toString().trim();
}

// BUG (correctness): `<=` reads one element past the end of the array.
// BUG (correctness): divides by zero when the buffers are empty -> NaN.
function pixelDiffRatio(actual, expected) {
  let differing = 0;
  for (let i = 0; i <= actual.length; i++) {
    if (actual[i] !== expected[i]) differing++;
  }
  return differing / actual.length;
}

module.exports = { screenshotName, pixelDiffRatio };
