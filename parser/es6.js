var parser = require("@babel/parser");
var file = require("../util/file");

exports.parseES6 = async function (filename) {
  const content =  await file.getContent(filename)
  return (0, parser.parse)(content, {
    sourceType: 'module'
  });
}
