var acorn = require("acorn");
var babel = require("@babel/parser");
var file = require("../util/file");
var jsx = require("acorn-jsx");

exports.default = async function (filename) {
  const content = await file.getContent(filename);
  var JSXParser = acorn.Parser.extend(jsx());
  try {
    return JSXParser.parse(content, {
      sourceType: "module",
      ecmaVersion: "latest",
      allowHashBang: true,
    });
  } catch (error) {
    console.log(error);
    console.log(filename);
    return 0;
  }
};

module.exports = exports.default;
