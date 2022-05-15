const styx = require('styx')
const parser = require('../parser/espree_parser')

exports.default = async function ConstructCFG(filename) {
  let ast = await parser(filename)
  return styx.parse(ast)
}