const esgraph = require('esgraph')
const parser = require('../parser/espree_parser')

exports.default = async function ConstructCFG(filename) {
  let ast = await parser(filename)
  return esgraph(ast)
}