var acorn = require("acorn");
var babel = require("@babel/parser");
var file = require("../util/file");

exports.default = async function (filename) {
  const content = await file.getContent(filename);
  try {
    return acorn.parse(content, {
      sourceType: 'module',
      ecmaVersion: 'latest'
    });
  } catch (error) {
    console.log(error);
    console.log(filename);
    return 0;
  }
};

module.exports = exports.default;
