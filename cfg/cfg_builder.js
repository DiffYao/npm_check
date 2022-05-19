// require('debug').enable("eslint:code-path");
const CodePathAnalyzer = require("./code-path-analysis/code-path-analyzer");
const NodeEventGenerator = require("./node-event-generator");
const estraverse = require("estraverse");
const createEmitter = require("./safe-emitter");
const no_unreachable_code = require("./no-unreachable");
const vk = require("eslint-visitor-keys");

class CFG {
	constructor(sourceCode) {
		this.sourceCode = sourceCode;
		this.ast = sourceCode.ast;
		this.codePaths = [];
		this.context = new Context(sourceCode);
		this.unReachableNodes = [];
	}

	getCodePaths() {
		return this.codePaths;
	}

	getUnreachableNode() {
		return this.unReachableNodes;
	}

	Build() {
		let currentNode = this.sourceCode.ast;
		const emitter = createEmitter();
		const nodeQueue = [];

		let listeners = no_unreachable_code.create(this.context);
		Object.keys(listeners).forEach((selector) => {
			emitter.on(selector, addRuleErrorHandler(listeners[selector]));
		});

		estraverse.traverse(this.sourceCode.ast, {
			enter(node, parent) {
				node.parent = parent;
				nodeQueue.push({ isEntering: true, node });
			},
			leave(node) {
				nodeQueue.push({ isEntering: false, node });
			},
			visitorKeys: this.sourceCode.visitorKeys,
		});

		// only run code path analyzer if the top level node is "Program", skip otherwise
		const eventGenerator =
			nodeQueue[0].node.type === "Program"
				? new CodePathAnalyzer(
						new NodeEventGenerator(emitter, {
							visitorKeys: this.sourceCode.visitorKeys,
							fallback: vk.getKeys,
						})
				  )
				: new NodeEventGenerator(emitter, {
						visitorKeys: this.sourceCode.visitorKeys,
						fallback: vk.getKeys,
				  });

		nodeQueue.forEach((traversalInfo) => {
			currentNode = traversalInfo.node;
			try {
				if (traversalInfo.isEntering) {
					eventGenerator.enterNode(currentNode);
				} else {
					eventGenerator.leaveNode(currentNode);
				}
			} catch (err) {
				err.currentNode = currentNode;
				throw err;
			}
		});

		this.unReachableNodes = this.context.unReachableData;
		this.codePaths = this.context.codePaths;
		return;
	}

	DumpDot() {
		let dots = [];

		this.codePaths.forEach((codePath) => {
			dots.push(dumpDot(codePath));
		});
		return dots;
	}
}

function parseCodePaths(code) {
	const retv = [];

	return retv;
}

function addRuleErrorHandler(ruleListener) {
	return function ruleErrorHandler(...listenerArgs) {
		try {
			return ruleListener(...listenerArgs);
		} catch (e) {
			e.ruleId = ruleId;
			throw e;
		}
	};
}

class Context {
	constructor(sourceCode) {
		this.sourceCode = sourceCode;
		this.unReachableData = [];
		this.codePaths = [];
	}

	getSourceCode() {
		return this.sourceCode;
	}

	report(info) {
		this.unReachableData.push(info);
	}
}
/**
 *
 *
 * @param {*} codePath
 * @return {*}
 */
function dumpDot(codePath) {
	let text =
		"\n" +
		"digraph {\n" +
		'node[shape=box,style="rounded,filled",fillcolor=white];\n' +
		'initial[label="",shape=circle,style=filled,fillcolor=black,width=0.25,height=0.25];\n';

	if (codePath.returnedSegments.length > 0) {
		text +=
			'final[label="",shape=doublecircle,style=filled,fillcolor=black,width=0.25,height=0.25];\n';
	}
	if (codePath.thrownSegments.length > 0) {
		text += 'thrown[label="✘",shape=circle,width=0.3,height=0.3,fixedsize];\n';
	}

	const traceMap = Object.create(null);
	const arrows = makeDotArrows(codePath, traceMap);

	for (const id in traceMap) {
		// eslint-disable-line guard-for-in -- Want ability to traverse prototype
		const segment = traceMap[id];

		text += `${id}[`;

		if (segment.reachable) {
			text += 'label="';
		} else {
			text +=
				'style="rounded,dashed,filled",fillcolor="#FF9800",label="<<unreachable>>\\n';
		}

		if (segment.internal.nodes && segment.internal.nodes.length > 0) {
			text += segment.internal.nodes.join("\\n");
		} else {
			text += "????";
		}

		text += '"];\n';
	}

	text += `${arrows}\n`;
	text += "}";

	return text;
}

function makeDotArrows(codePath, traceMap) {
	const stack = [[codePath.initialSegment, 0]];
	const done = traceMap || Object.create(null);
	let lastId = codePath.initialSegment.id;
	let text = `initial->${codePath.initialSegment.id}`;

	while (stack.length > 0) {
		const item = stack.pop();
		const segment = item[0];
		const index = item[1];

		if (done[segment.id] && index === 0) {
			continue;
		}
		done[segment.id] = segment;

		const nextSegment = segment.allNextSegments[index];

		if (!nextSegment) {
			continue;
		}

		if (lastId === segment.id) {
			text += `->${nextSegment.id}`;
		} else {
			text += `;\n${segment.id}->${nextSegment.id}`;
		}
		lastId = nextSegment.id;

		stack.unshift([segment, 1 + index]);
		stack.push([nextSegment, 0]);
	}

	codePath.returnedSegments.forEach((finalSegment) => {
		if (lastId === finalSegment.id) {
			text += "->final";
		} else {
			text += `;\n${finalSegment.id}->final`;
		}
		lastId = null;
	});

	codePath.thrownSegments.forEach((finalSegment) => {
		if (lastId === finalSegment.id) {
			text += "->thrown";
		} else {
			text += `;\n${finalSegment.id}->thrown`;
		}
		lastId = null;
	});

	return `${text};`;
}

exports.CFG = CFG;
exports.parseCodePaths = parseCodePaths;
