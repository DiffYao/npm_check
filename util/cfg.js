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

