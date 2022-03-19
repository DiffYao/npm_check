const { exec } = require("child_process")
var exprima = require("esprima")
const fs = require('fs')
const util = require('util');
const getPackage = require("./get_installed_package")
const readPackageJson = require('./read_package_json');
const path = require('path');

var data = ""
try {
    data = fs.readFileSync("/Users/diffyao/Code/node_learn/easy_app/index.js", 'utf8')
} catch (err) {
    console.error(err)
}


var program = exprima.parseScript(data)
var i = 0
program.body.forEach(function (element) {
    //    console.log(element.type)

    if (i == 0) {
        //   console.log(element.declarations[0].init)
        i++
    }
})

const data2 = JSON.stringify(program);

// console.log(data2)

dir = process.cwd()
// console.log(dir + dir)
var cmdStr = util.format('cd %s; npm ls -a --json', dir)
exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
        console.log('get weather api err ' + err)
    } else {
        // console.log(stdout)
        var obj = JSON.parse(stdout)
    }
})

path2 = path.resolve(process.cwd(), "./package.json")
console.log("path is " + path2)
var package = readPackageJson(path2)
console.log(package)
console.log(typeof package['dependencies']['globby'])
for (const package2 in package['dependencies']) {
    console.log(util.format("package %s; version %s", package2, package['dependencies'][package2]));
}