var fs = require("fs");
var util = require ("util");

const readFileAsync = util.promisify(fs.readFile);

const promises = {};

exports.getContent = function getContent(filename) {
  if (!promises[filename]) {
    promises[filename] = readFileAsync(filename, 'utf8');
  }
  return promises[filename];
}

exports.setContent = function setContent(filename, content) {
  promises[filename] = Promise.resolve(content);
}
