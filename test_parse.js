var parse = require("./parser/es6")

var parseFile = parse.parseES6("/Users/diffyao/Code/node_learn/easy_app/index.js")

parseFile.then((val) => console.log("asynchronous logging has val:",val))