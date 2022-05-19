var esprima = require("esprima");
var Styx = require("styx");
var parser = require("./parser/acorn_parser");
const fs = require("fs");

const filename = "/Users/diffyao/Desktop/listr-master/index.js";
var ast = parser(filename)
	.then((ast) => {
		return ast;
	})
	.then((ast) => {
		var flowProgram = Styx.parse(ast);
		var ob = Styx.exportAsObject(flowProgram);
		var json = Styx.exportAsJson(flowProgram);
		var dot = Styx.exportAsDot(flowProgram.flowGraph, "cfg");

		try {
			const data = fs.writeFileSync("./unused/cfg.json", json);
			const data2 = fs.writeFileSync("./unused/cfg.dot", dot);
			//文件写入成功。
		} catch (err) {
			console.error(err);
		}
	});

