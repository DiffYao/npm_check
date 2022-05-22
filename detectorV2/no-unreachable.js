function isInitialized(node) {
	return Boolean(node.init);
}

function isUnreachable(segment) {
	return !segment.reachable;
}

class ConsecutiveRange {
	constructor(sourceCode) {
		this.sourceCode = sourceCode;
		this.startNode = null;
		this.endNode = null;
	}

	
	get location() {
		return {
			start: this.startNode.loc.start,
			end: this.endNode.loc.end,
		};
	}

	
	get isEmpty() {
		return !(this.startNode && this.endNode);
	}

	
	contains(node) {
		return (
			node.range[0] >= this.startNode.range[0] &&
			node.range[1] <= this.endNode.range[1]
		);
	}

	
	isConsecutive(node) {
		return this.contains(this.sourceCode.getTokenBefore(node));
	}

	merge(node) {
		this.endNode = node;
	}

	reset(node) {
		this.startNode = this.endNode = node;
	}
}

module.exports = {
	meta: {
		type: "problem",

		docs: {},

		schema: [],

		messages: {
			unreachableCode: "Unreachable code.",
		},
	},

	create(context) {
		let currentCodePath = null;

		let constructorInfo = null;

		const range = new ConsecutiveRange(context.getSourceCode());

		function reportIfUnreachable(node) {
			let nextNode = null;
			if (
				node &&
				(node.type === "PropertyDefinition" ||
					currentCodePath.currentSegments.every(isUnreachable))
			) {
				// Store this statement to distinguish consecutive statements.
				if (range.isEmpty) {
					range.reset(node);
					return;
				}

				// Skip if this statement is inside of the current range.
				if (range.contains(node)) {
					return;
				}

				// Merge if this statement is consecutive to the current range.
				if (range.isConsecutive(node)) {
					range.merge(node);
					return;
				}

				nextNode = node;
			}

			/*
			 * Report the current range since this statement is reachable or is
			 * not consecutive to the current range.
			 */
			if (!range.isEmpty) {
				context.report({
					messageId: "unreachableCode",
					loc: range.location,
					node: range.startNode,
				});
			}

			// Update the current range.
			range.reset(nextNode);
		}

		return {
			// Manages the current code path.
			onCodePathStart(codePath) {
				currentCodePath = codePath;
				context.codePaths.push(codePath);
			},

			onCodePathEnd() {
				currentCodePath = currentCodePath.upper;
			},

			// Registers for all statement nodes (excludes FunctionDeclaration).
			BlockStatement: reportIfUnreachable,
			BinaryExpression: reportIfUnreachable,
			BreakStatement: reportIfUnreachable,
			ClassDeclaration: reportIfUnreachable,
			ContinueStatement: reportIfUnreachable,
			DebuggerStatement: reportIfUnreachable,
			DoWhileStatement: reportIfUnreachable,
			ExpressionStatement: reportIfUnreachable,
			ForInStatement: reportIfUnreachable,
			ForOfStatement: reportIfUnreachable,
			ForStatement: reportIfUnreachable,
			IfStatement: reportIfUnreachable,
			ImportDeclaration: reportIfUnreachable,
			LabeledStatement: reportIfUnreachable,
			ReturnStatement: reportIfUnreachable,
			SwitchStatement: reportIfUnreachable,
			ThrowStatement: reportIfUnreachable,
			TryStatement: reportIfUnreachable,

			VariableDeclaration(node) {
				if (node.kind !== "var" || node.declarations.some(isInitialized)) {
					reportIfUnreachable(node);
				}
			},

			WhileStatement: reportIfUnreachable,
			WithStatement: reportIfUnreachable,
			ExportNamedDeclaration: reportIfUnreachable,
			ExportDefaultDeclaration: reportIfUnreachable,
			ExportAllDeclaration: reportIfUnreachable,

			"Program:exit"() {
				reportIfUnreachable();
			},

			/*
			 * Instance fields defined in a subclass are never created if the constructor of the subclass
			 * doesn't call `super()`, so their definitions are unreachable code.
			 */
			"MethodDefinition[kind='constructor']"() {
				constructorInfo = {
					upper: constructorInfo,
					hasSuperCall: false,
				};
			},
			"MethodDefinition[kind='constructor']:exit"(node) {
				const { hasSuperCall } = constructorInfo;

				constructorInfo = constructorInfo.upper;

				// skip typescript constructors without the body
				if (!node.value.body) {
					return;
				}

				const classDefinition = node.parent.parent;

				if (classDefinition.superClass && !hasSuperCall) {
					for (const element of classDefinition.body.body) {
						if (element.type === "PropertyDefinition" && !element.static) {
							reportIfUnreachable(element);
						}
					}
				}
			},
			"CallExpression > Super.callee"() {
				if (constructorInfo) {
					constructorInfo.hasSuperCall = true;
				}
			},
		};
	},
};
