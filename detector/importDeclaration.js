exports.default = function (node) {
  if (node.type !== "ImportDeclaration" || !node.source || !node.source.value) {
    return [];
  }

  return node.source.value;
};

module.exports = exports.default