// Smoke-test sample for the Claude code-review workflow.
// This file exists only to give the reviewer something concrete to look at.
// The PR that adds it is not meant to be merged.

function pixelDiffRatio(a, b) {
  var total = a.length;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      diff = diff + 1;
    }
  }
  return diff / total;
}

module.exports = { pixelDiffRatio };
