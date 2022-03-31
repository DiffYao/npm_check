var parser = require("esprima");
var file = require("../util/file");

exports.default = async function (filename) {
  const content = await file.getContent(filename);
  try {
    return parser.parseModule(content);
  } catch (error) {
    console.log(content);
    return 0;
  }
};

module.exports = exports.default;
