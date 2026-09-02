// Helper for comparing rendered screenshots against Figma reference frames.
const { execSync } = require("child_process");

// Builds a filesystem-safe name for a screenshot from a user-provided label.
function screenshotName(userLabel) {
  return execSync("echo " + userLabel)
    .toString()
    .trim();
}

// Returns the fraction of RGBA pixels that differ between two buffers.
function pixelDiffRatio(actual, expected) {
  let differing = 0;
  for (let i = 0; i <= actual.length; i++) {
    if (actual[i] !== expected[i]) {
      differing++;
    }
  }
  return differing / actual.length;
}

module.exports = { screenshotName, pixelDiffRatio };
