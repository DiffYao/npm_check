const estraverse = require("estraverse");
const esrecurse = require("esrecurse");
const Reference = require("./reference.js").default;
const Variable = require("./variable.js").Variable;
const PatternVisitor = require("./pattern-visitor.js").default;
const { Definition, ParameterDefinition } = require("./definition.js");
const assert = require("assert");

const { Syntax } = estraverse;

function isNode(node) {
	if (node == null) {
		return false;
	}
	return typeof node === "object" && typeof node.type === "string";
}

function isProperty(nodeType, key) {
	return (
		(nodeType === estraverse.Syntax.ObjectExpression ||
			nodeType === estraverse.Syntax.ObjectPattern) &&
		key === "properties"
	);
}

/**
 * Traverse identifier in pattern
 * @param {Object} options options
 * @param {pattern} rootPattern root pattern
 * @param {Refencer} referencer referencer
 * @param {callback} callback callback
 * @returns {void}
 */
function traverseIdentifierInPattern(
	options,
	rootPattern,
	referencer,
	callback
) {
	// Call the callback at left hand identifier nodes, and Collect right hand nodes.
	const visitor = new PatternVisitor(options, rootPattern, callback);

	visitor.visit(rootPattern);

	// Process the right hand nodes recursively.
	if (referencer !== null && referencer !== undefined) {
		visitor.rightHandNodes.forEach(referencer.visit, referencer);
	}
}

class Importer extends esrecurse.Visitor {
	constructor(declaration, referencer) {
		super(null, referencer.options);
		this.declaration = declaration;
		this.referencer = referencer;
	}

	visitImport(id, specifier) {
		this.referencer.visitPattern(id, (pattern) => {
			this.referencer
				.currentScope()
				.__define(
					pattern,
					new Definition(
						Variable.ImportBinding,
						pattern,
						specifier,
						this.declaration,
						null,
						null
					)
				);
		});
	}

	ImportNamespaceSpecifier(node) {
		const local = node.local || node.id;

		if (local) {
			this.visitImport(local, node);
		}
	}

	ImportDefaultSpecifier(node) {
		const local = node.local || node.id;

		this.visitImport(local, node);
	}

	ImportSpecifier(node) {
		const local = node.local || node.id;

		if (node.name) {
			this.visitImport(node.name, node);
		} else {
			this.visitImport(local, node);
		}
	}
}

function getKey(node) {
	return node.specialType + node.range;
}

// Referencing variables and creating bindings.
class Referencer extends esrecurse.Visitor {
	constructor(options, scopeManager) {
		super(null, options);
		this.options = options;
		this.scopeManager = scopeManager;
		this.parent = null;
		this.isInnerMethodDefinition = false;
		this.lock = false;
		this.unlockNode = "temp";
		this.set = new Set();
		this.patternSet = new WeakSet();
	}

	VisitNodeMap(nodeMap) {
		let type =
			nodeMap.str.endsWith("enter") || nodeMap.str.endsWith("exit")
				? nodeMap.str
				: nodeMap.node.type;
		nodeMap.node.specialType = type;

		if (this.lock && !type.startsWith(this.unlockNode)) {
			// console.log("skip " + type);
			return;
		}

		// console.log(type);
		if (this.__visitor[type]) {
			if (this.set.has(getKey(nodeMap.node))) {
				console.log("duplicate " + type);
				return;
			}
			this.set.add(getKey(nodeMap.node));
			this.__visitor[type].call(this, nodeMap.node);
			return;
		}

		if (type.endsWith(":exit")) {
			this.close(nodeMap.node);
			return;
		}

		let children = this.__childVisitorKeys[nodeMap.node.type];
		if (!children) {
			console.log("not hit:" + type);
			return;
		}
		
	}

	Visit(node) {
		if (!node || this.set.has(getKey(node))) {
			return;
		}
		this.set.add(getKey(node));
		this.visit(node);
	}

	currentScope() {
		return this.scopeManager.__currentScope;
	}

	Lock(node) {
		this.lock = true;
		this.unlockNode = node.type + ":exit";
	}

	unLock(node) {
		this.lock = false;
		this.unlockNode = "temp";
	}

	close(node) {
		while (this.currentScope() && node.loc === this.currentScope().block.loc) {
			this.scopeManager.__currentScope = this.currentScope().__close(
				this.scopeManager
			);
		}
	}

	pushInnerMethodDefinition(isInnerMethodDefinition) {
		const previous = this.isInnerMethodDefinition;

		this.isInnerMethodDefinition = isInnerMethodDefinition;
		return previous;
	}

	popInnerMethodDefinition(isInnerMethodDefinition) {
		this.isInnerMethodDefinition = isInnerMethodDefinition;
	}

	referencingDefaultValue(pattern, assignments, maybeImplicitGlobal, init) {
		const scope = this.currentScope();

		assignments.forEach((assignment) => {
			scope.__referencing(
				pattern,
				Reference.WRITE,
				assignment.right,
				maybeImplicitGlobal,
				pattern !== assignment.left,
				init
			);
		});
	}

	visitPattern(node, options, callback) {
		let visitPatternOptions = options;
		let visitPatternCallback = callback;

		if (typeof options === "function") {
			visitPatternCallback = options;
			visitPatternOptions = { processRightHandNodes: false };
		}

		traverseIdentifierInPattern(
			this.options,
			node,
			visitPatternOptions.processRightHandNodes ? this : null,
			visitPatternCallback
		);
	}

	visitFunction(node) {
		let i, iz;

		// FunctionDeclaration name is defined in upper scope
		// NOTE: Not referring variableScope. It is intended.
		// Since
		//  in ES5, FunctionDeclaration should be in FunctionBody.
		//  in ES6, FunctionDeclaration should be block scoped.

		if (node.type === Syntax.FunctionDeclaration) {
			// id is defined in upper scope
			this.currentScope().__define(
				node.id,
				new Definition(Variable.FunctionName, node.id, node, null, null, null)
			);
		}

		// FunctionExpression with name creates its special scope;
		// FunctionExpressionNameScope.
		if (node.type === Syntax.FunctionExpression && node.id) {
			this.scopeManager.__nestFunctionExpressionNameScope(node);
		}

		// Consider this function is in the MethodDefinition.
		this.scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);

		const that = this;

		/**
		 * Visit pattern callback
		 * @param {pattern} pattern pattern
		 * @param {Object} info info
		 * @returns {void}
		 */
		function visitPatternCallback(pattern, info) {
			that
				.currentScope()
				.__define(
					pattern,
					new ParameterDefinition(pattern, node, i, info.rest)
				);

			that.referencingDefaultValue(pattern, info.assignments, null, true);
		}

		// Process parameter declarations.
		for (i = 0, iz = node.params.length; i < iz; ++i) {
			this.visitPattern(
				node.params[i],
				{ processRightHandNodes: true },
				visitPatternCallback
			);
		}

		// if there's a rest argument, add that
		if (node.rest) {
			this.visitPattern(
				{
					type: "RestElement",
					argument: node.rest,
				},
				(pattern) => {
					this.currentScope().__define(
						pattern,
						new ParameterDefinition(pattern, node, node.params.length, true)
					);
				}
			);
		}

		// In TypeScript there are a number of function-like constructs which have no body,
		// so check it exists before traversing
		// if (node.2body) {

		//     // Skip BlockStatement to prevent creating BlockStatement scope.
		//     if (node.2body.type === Syntax.BlockStatement) {
		//         this.visi2tChildren(node.2body);
		//     } else {
		//         this.Visit(node.2body);
		//     }
		// }

		// this.close(node2);
	}

	visitClass(node) {
		if (node.type === Syntax.ClassDeclaration) {
			this.currentScope().__define(
				node.id,
				new Definition(Variable.ClassName, node.id, node, null, null, null)
			);
		}

		this.Visit(node.superClass);

		this.scopeManager.__nestClassScope(node);

		if (node.id) {
			this.currentScope().__define(
				node.id,
				new Definition(Variable.ClassName, node.id, node)
			);
		}

		// this.Visit(node.2body);

		// 默认实现 fallback
		// this.close(node2);
	}

	visitProperty(node) {
		let previous;

		if (node.computed) {
			this.Visit(node.key);
		}

		const isMethodDefinition = node.type === Syntax.MethodDefinition;

		if (isMethodDefinition) {
			previous = this.pushInnerMethodDefinition(true);
		}
		this.Visit(node.value);
		if (isMethodDefinition) {
			this.popInnerMethodDefinition(previous);
		}
	}

	visitForIn(node) {
		if (
			node.left.type === Syntax.VariableDeclaration &&
			node.left.kind !== "var"
		) {
			this.scopeManager.__nestForScope(node);
		}

		if (node.left.type === Syntax.VariableDeclaration) {
			this.Visit(node.left);
			this.visitPattern(node.left.declarations[0].id, (pattern) => {
				this.currentScope().__referencing(
					pattern,
					Reference.WRITE,
					node.right,
					null,
					true,
					true
				);
			});
		} else {
			this.visitPattern(
				node.left,
				{ processRightHandNodes: true },
				(pattern, info) => {
					let maybeImplicitGlobal = null;

					if (!this.currentScope().isStrict) {
						maybeImplicitGlobal = {
							pattern,
							node,
						};
					}
					this.referencingDefaultValue(
						pattern,
						info.assignments,
						maybeImplicitGlobal,
						false
					);
					this.currentScope().__referencing(
						pattern,
						Reference.WRITE,
						node.right,
						maybeImplicitGlobal,
						true,
						false
					);
				}
			);
		}
		// this.2visit(node.right);
		// this.2visit(node.body);

		// this.close(node2);
	}

	visitVariableDeclaration(variableTargetScope, type, node, index) {
		const decl = node.declarations[index];
		const init = decl.init;

		this.visitPattern(
			decl.id,
			{ processRightHandNodes: true },
			(pattern, info) => {
				variableTargetScope.__define(
					pattern,
					new Definition(type, pattern, decl, node, index, node.kind)
				);

				this.referencingDefaultValue(pattern, info.assignments, null, true);
				if (init) {
					this.currentScope().__referencing(
						pattern,
						Reference.WRITE,
						init,
						null,
						!info.topLevel,
						true
					);
				}
			}
		);
	}

	AssignmentExpression(node) {
		// console.log(node);
		if (PatternVisitor.isPattern(node.left)) {
			if (node.operator === "=") {
				this.visitPattern(
					node.left,
					{ processRightHandNodes: true },
					(pattern, info) => {
						let maybeImplicitGlobal = null;

						if (!this.currentScope().isStrict) {
							maybeImplicitGlobal = {
								pattern,
								node,
							};
						}
						this.referencingDefaultValue(
							pattern,
							info.assignments,
							maybeImplicitGlobal,
							false
						);
						this.currentScope().__referencing(
							pattern,
							Reference.WRITE,
							node.right,
							maybeImplicitGlobal,
							!info.topLevel,
							false
						);
					}
				);
			} else {
				this.currentScope().__referencing(node.left, Reference.RW, node.right);
			}
		} else {
			this.Visit(node.left);
		}
		this.Visit(node.right);
	}

	"CatchClause:enter"(node) {
		this.scopeManager.__nestCatchScope(node);

		this.visitPattern(
			node.param,
			{ processRightHandNodes: true },
			(pattern, info) => {
				this.currentScope().__define(
					pattern,
					new Definition(
						Variable.CatchClause,
						node.param,
						node,
						null,
						null,
						null
					)
				);
				this.referencingDefaultValue(pattern, info.assignments, null, true);
			}
		);
		// this.2visit(node.body);

		// this.close(node2);
	}

	"Program:enter"(node) {
		this.scopeManager.__nestGlobalScope(node);

		if (this.scopeManager.__isNodejsScope()) {
			// Force strictness of GlobalScope to false when using node.js scope.
			this.currentScope().isStrict = false;
			this.scopeManager.__nestFunctionScope(node, false);
		}

		if (this.scopeManager.__isES6() && this.scopeManager.isModule()) {
			this.scopeManager.__nestModuleScope(node);
		}

		if (
			this.scopeManager.isStrictModeSupported() &&
			this.scopeManager.isImpliedStrict()
		) {
			this.currentScope().isStrict = true;
		}
	}

	Identifier(node) {
		this.currentScope().__referencing(node);
	}

	// eslint-disable-next-line class-methods-use-this
	PrivateIdentifier() {
		// Do nothing.
	}

	UpdateExpression(node) {
		if (PatternVisitor.isPattern(node.argument)) {
			this.currentScope().__referencing(node.argument, Reference.RW, null);
		} else {
			// this.visit2Children(node);
		}
	}

	MemberExpression(node) {
		this.Visit(node.object);
		if (node.computed) {
			this.Visit(node.property);
		}
	}

	Property(node) {
		this.visitProperty(node);
	}

	PropertyDefinition(node) {
		const { computed, key, value } = node;

		if (computed) {
			this.Visit(key);
		}
		if (value) {
			this.scopeManager.__nestClassFieldInitializerScope(value);
			this.Visit(value);
			this.close(value);
		}
	}

	"StaticBlock:enter"(node) {
		this.scopeManager.__nestClassStaticBlockScope(node);

		// this.visit2Children(node);

		// this.close(node2);
	}

	MethodDefinition(node) {
		this.visitProperty(node);
	}

	BreakStatement() {}

	ContinueStatement() {}

	LabeledStatement(node) {
		// this.2visit(node.body);
	}

	"ForStatement:enter"(node) {
		if (
			node.init &&
			node.init.type === Syntax.VariableDeclaration &&
			node.init.kind !== "var"
		) {
			this.scopeManager.__nestForScope(node);
		}
	}

	"ForStatement:enter"(node) {
		// Create ForStatement declaration.
		// NOTE: In ES6, ForStatement dynamically generates
		// per iteration environment. However, escope is
		// a static analyzer, we only generate one scope for ForStatement.
		if (
			node.init &&
			node.init.type === Syntax.VariableDeclaration &&
			node.init.kind !== "var"
		) {
			this.scopeManager.__nestForScope(node);
		}

		// this.visit2Children(node);

		// this.close(node2);
	}

	"ClassExpression:enter"(node) {
		this.visitClass(node);
	}

	// ClassExpression(node) {
	//     this.visitClass(node);
	// }

	"ClassDeclaration:enter"(node) {
		this.visitClass(node);
	}

	// ClassDeclaration(node) {
	//     this.visitClass(node);
	// }

	CallExpression(node) {
		// Check this is direct call to eval
		if (
			!this.scopeManager.__ignoreEval() &&
			node.callee.type === Syntax.Identifier &&
			node.callee.name === "eval"
		) {
			// NOTE: This should be `variableScope`. Since direct eval call always creates Lexical environment and
			// let / const should be enclosed into it. Only VariableDeclaration affects on the caller's environment.
			this.currentScope().variableScope.__detectEval();
		}
		// this.visit2Children(node);
	}

	"BlockStatement:enter"(node) {
		if (this.scopeManager.__isES6()) {
			this.scopeManager.__nestBlockScope(node);
		}

		// this.visit2Children(node);

		// this.close(node2);
	}

	ThisExpression() {
		this.currentScope().variableScope.__detectThis();
	}

	"WithStatement:enter"(node) {
		this.Visit(node.object);

		// Then nest scope for WithStatement.
		this.scopeManager.__nestWithScope(node);

		// this.2visit(node.body);

		// this.close(node2);
	}

	"VariableDeclaration:enter"(node) {
		this.Lock(node);
		const variableTargetScope =
			node.kind === "var"
				? this.currentScope().variableScope
				: this.currentScope();

		for (let i = 0, iz = node.declarations.length; i < iz; ++i) {
			const decl = node.declarations[i];

			this.visitVariableDeclaration(
				variableTargetScope,
				Variable.Variable,
				node,
				i
			);
			if (decl.init) {
				this.Visit(decl.init);
			}
		}
	}

	"VariableDeclaration:exit"(node) {
		this.unLock(node);
		this.close(node);
	}

	VariableDeclaration(node) {
		const variableTargetScope =
			node.kind === "var"
				? this.currentScope().variableScope
				: this.currentScope();

		for (let i = 0, iz = node.declarations.length; i < iz; ++i) {
			const decl = node.declarations[i];

			this.visitVariableDeclaration(
				variableTargetScope,
				Variable.Variable,
				node,
				i
			);
			if (decl.init) {
				this.Visit(decl.init);
			}
		}
	}

	// sec 13.11.8
	"SwitchStatement:enter"(node) {
		this.Lock(node);

		this.Visit(node.discriminant);

		if (this.scopeManager.__isES6()) {
			this.scopeManager.__nestSwitchScope(node);
		}

		for (let i = 0, iz = node.cases.length; i < iz; ++i) {
			this.Visit(node.cases[i]);
		}
	}

	"SwitchStatement:exit"(node) {
		this.unLock(node);
		this.close(node);
	}

	"FunctionDeclaration:enter"(node) {
		this.visitFunction(node);
	}

	// todo
	"ArrowFunctionExpression:enter"(node) {
		this.visitFunction(node);
	}

	"FunctionExpression:enter"(node) {
		this.visitFunction(node);
	}

	visitNewCodePath(node) {
		let temp = this;
		// console.log("new code path");
		node.parentCodePath.traverseSegmentsTrue(function (segment) {
			segment.Nodes.forEach((nodeMap) => {
				if (!segment.reachable && !nodeMap.str.endsWith("exit")) {
					return;
				}
				temp.VisitNodeMap(nodeMap);
			});
		});
	}

	FunctionExpression(node) {
		this.visitNewCodePath(node);
	}

	FunctionDeclaration(node) {
		this.visitNewCodePath(node);
	}

	ArrowFunctionExpression(node) {
		this.visitNewCodePath(node);
	}

	StaticBlock(node) {
		this.visitNewCodePath(node);
	}

	"ForOfStatement:enter"(node) {
		this.visitForIn(node);
	}

	"ForInStatement:enter"(node) {
		this.visitForIn(node);
	}

	ImportDeclaration(node) {
		assert(
			this.scopeManager.__isES6() && this.scopeManager.isModule(),
			"ImportDeclaration should appear when the mode is ES6 and in the module context."
		);

		const importer = new Importer(node, this);

		importer.visit(node);
	}

	visitExportDeclaration(node) {
		if (node.source) {
			return;
		}
		if (node.declaration) {
			this.Visit(node.declaration);
			return;
		}

		// this.visit2Children(node);
	}

	// TODO: ExportDeclaration doesn't exist. for bc?
	ExportDeclaration(node) {
		this.visitExportDeclaration(node);
	}

	ExportAllDeclaration(node) {
		this.visitExportDeclaration(node);
	}

	ExportDefaultDeclaration(node) {
		this.visitExportDeclaration(node);
	}

	ExportNamedDeclaration(node) {
		this.visitExportDeclaration(node);
	}

	ExportSpecifier(node) {
		// TODO: `node.id` doesn't exist. for bc?
		const local = node.id || node.local;

		this.Visit(local);
	}

	MetaProperty() {
		// eslint-disable-line class-methods-use-this
		// do nothing.
	}
}

exports.default = Referencer;

/* vim: set sw=4 ts=4 et tw=80 : */
