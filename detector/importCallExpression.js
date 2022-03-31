const lodash = require("lodash")

exports.default = function (node) {
  return node.type === "CallExpression" &&
    node.callee &&
    ((node.callee.type === "Identifier" && node.callee.name === "import") ||
      node.callee.type === "Import" ||
      (node.callee.type === "MemberExpression" &&
        node.callee.object &&
        node.callee.object.name === "System" &&
        node.callee.property &&
        node.callee.property.name === "import")) &&
    node.arguments[0] &&
    lodash.isString(node.arguments[0].value)
    ? [node.arguments[0].value]
    : [];
};
module.exports = exports.default;
