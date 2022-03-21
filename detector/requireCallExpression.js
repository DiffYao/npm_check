exports.default = function (node) {
  if (
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1
  ) {
    if (
      node.arguments[0].type === 'Literal' ||
      node.arguments[0].type === 'StringLiteral'
    ) {
      return typeof node.arguments[0].value === 'string'
        ? node.arguments[0].value: [];
    }
  }
  return [];
}

module.exports = exports.default