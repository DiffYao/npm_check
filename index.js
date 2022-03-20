var getDefinedPkg = require('./get_defined_pkg')
var dev = require('./get_dependence')

// 获取定义的package
rootDir = "/Users/diffyao/Code/node_learn/easy_app"
definedPkg = getDefinedPkg.getDeps(rootDir)
console.log(definedPkg)

// 获取实际使用的dev
dev.getDependencies(rootDir+'/index.js', rootDir).then((val) => console.log(val))