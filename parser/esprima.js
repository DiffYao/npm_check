var acorn = require("acorn");
var parser = require("esprima");
var file = require("../util/file");
var jsx = require("acorn-jsx");

exports.default = async function (filename) {
  const content = await file.getContent(filename);
  try {
    return parser.parseModule(content, {
        jsx: true
    });
  } catch (error) {
    console.log(error);
    console.log(filename);
    return 0;
  }
};

module.exports = exports.default;
