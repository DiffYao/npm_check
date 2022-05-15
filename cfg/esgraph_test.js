const cfg = require("./esgraph_cfg");
const fs = require("fs");
const utils = require('../util/cfg')

fileName = '/Users/diffyao/Code/node_learn/npm_check/easy_app/index3.js' // '/Users/diffyao/Desktop/node-fetch-main/example.js';
res = []

cfg.default(fileName).then((flowProgram) => {
  let start = flowProgram[0];
  GetNextNode(flowProgram, start, new WeakSet());

  console.log(JSON.stringify(res));
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

	visited.add(node);
  console.log(node);
  res.push(node.astNode);
	for (let i = 0; i < node.next.length; i++) {
		GetNextNode(flowProgram, node.next[i], visited);
	}
}


