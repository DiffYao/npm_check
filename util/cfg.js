var lodash = require("lodash");

function hasVisited(ast, visited) {
	try {
		return visited.has(ast);
	} catch (e) {
		return false;
	}
}

function recursive(ast, visited) {
	if (!ast || hasVisited(ast, visited)) {
		return [];
	}
	if (Array.isArray(ast)) {
		return lodash(ast)
			.map((node) => recursive(node, visited))
			.flatten()
			.value();
	}
	if (ast.type) {
		visited.add(ast);
		return lodash(ast)
			.keys()
			.filter((key) => key !== "tokens" && key !== "comments")
			.map((key) => recursive(ast[key], visited))
			.flatten()
			.concat(ast)
			.value();
	}

	return [];
}

exports.getNodes = function (flowProgram) {
	let startNode = flowProgram.flowGraph.entry;

	// funcMap
	flowProgram.funcMap = {};
	flowProgram.functions.forEach((func) => {
		flowProgram.funcMap[func.name] = func;
	});

	// nodes
	flowProgram.nodes = [];

	recursive(flowProgram, startNode, visited);

	return;
};

function recursive(flowProgram, node, visited) {
	if (!node || hasVisited(node, visited)) {
		return;
	}

	visited.add(node);

	for (let i = 0; i < node.outgoingEdges.length; i++) {
		let edge = node.outgoingEdges[i];

		// 使用 func替代
		if (edge.label.indexOf("$$func") >= 0) {
			let func = "$$func" + edge.label.split("$$func")[1].split(")")[0];
			flow2 = flowProgram.funcMap[func];

			GetNextNode(flowProgram, flow2.flowGraph.entry, visited);
			continue;
		}

		if (edge.data) {
			// console.log(edge.data)
			flowProgram.nodes.push(edge.node);
		}

		GetNextNode(flowProgram, edge.target, visited);
    return;
	}
}
