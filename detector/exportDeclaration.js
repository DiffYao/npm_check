exports.default = function (node) {
  return (node.type === 'ExportNamedDeclaration' ||
    node.type === 'ExportAllDeclaration') &&
    node.source &&
    node.source.value
    ? [node.source.value]
    : [];
}

module.exports = exports.default
