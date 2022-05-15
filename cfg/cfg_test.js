const cfg = require("./styx_cfg");
const Styx = require("styx");
const fs = require("fs");
const utils = require('../util/cfg')

fileName = "/Users/diffyao/Code/node_learn/npm_check/easy_app/index.js";


cfg.default(fileName).then((flowProgram) => {
	// console.log(flowProgram)
	let startNode = flowProgram.flowGraph.entry;
	
	// funcMap
	flowProgram.funcMap = {};
	flowProgram.functions.forEach(func => {
		flowProgram.funcMap[func.name] = func;
	});

	GetNextNode(flowProgram, startNode, new WeakSet());
});


function hasVisited(node, visited) {
  try {
    return visited.has(node);
  } catch (e) {
    return false;
  }
}


function GetNextNode(flowProgram, node, visited) {
	if (!node || hasVisited(node, visited)) {
		return;
	}

	for (let i = 0; i < node.outgoingEdges.length; i++) {
		let edge = node.outgoingEdges[i];
		
		// 使用 func替代
		if (edge.label.indexOf("$$func") >= 0) {
			let func = '$$func' + edge.label.split("$$func")[1].split(")")[0];
			console.log(func)
			flow2 = flowProgram.funcMap[func];
			console.log(edge)
			GetNextNode(flowProgram, flow2.flowGraph.entry, visited);
			return
		}

		GetNextNode(flowProgram, edge.target, visited);
	}
}
