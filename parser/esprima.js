var parser = require("esprima")
var file = require("../util/file")

exports.default = async function (filename) {
  const content = await file.getContent(filename)
  return (0, parser.parse)(content, {
    sourceType: "module",
  })
}

module.exports = exports.default
