const astUtils = require("../util/ast-utils");

config = {
	vars: "all",
};

exports.isUsedVariable = function(variable){
	return isUsedVariable(variable) ||
	isExported(variable) ||
	hasRestSpreadSibling(variable);
}

exports.collectUnusedVariables = function collectUnusedVariables(
	scope,
	unusedVars
) {
	const variables = scope.variables;
	const childScopes = scope.childScopes;
	let i, l;

	if (scope.type !== "global") {
		for (i = 0, l = variables.length; i < l; ++i) {
			const variable = variables[i];

			// skip a variable of class itself name in the class scope
			if (
				scope.type === "class" &&
				scope.block.id === variable.identifiers[0]
			) {
				continue;
			}

			// skip function expression names and variables marked with markVariableAsUsed()
			if (scope.functionExpressionScope || variable.eslintUsed) {
				continue;
			}

			// skip implicit "arguments" variable
			if (
				scope.type === "function" &&
				variable.name === "arguments" &&
				variable.identifiers.length === 0
			) {
				continue;
			}

			// explicit global variables don't have definitions.
			const def = variable.defs[0];
			if (def) {
				const type = def.type;
				const refUsedInArrayPatterns = variable.references.some(
					(ref) =>
						ref.identifier &&
						ref.identifier.parent &&
						ref.identifier.parent.type === "ArrayPattern"
				);

				// skip elements of array destructuring patterns
				if (
					(def.name.parent && def.name.parent.type === "ArrayPattern" || refUsedInArrayPatterns) &&
					config.destructuredArrayIgnorePattern &&
					config.destructuredArrayIgnorePattern.test(def.name.name)
				) {
					continue;
				}

				if (type === "Parameter") {
					// skip ignored parameters
					if (!def.node.parent) {
						continue;
					}
					// skip any setter argument
					if (
						(def.node.parent.type === "Property" ||
							def.node.parent.type === "MethodDefinition") &&
						def.node.parent.kind === "set"
					) {
						continue;
					}
				}
			}

			if (
				!isUsedVariable(variable) &&
				!isExported(variable) &&
				!hasRestSpreadSibling(variable)
			) {
				unusedVars.push(variable);
			}
		}
	}

	for (i = 0, l = childScopes.length; i < l; ++i) {
		collectUnusedVariables(childScopes[i], unusedVars);
	}

	return unusedVars;
};

/**
 * Determines if the variable is used.
 * @param {Variable} variable The variable to check.
 * @returns {boolean} True if the variable is used
 * @private
 */
function isUsedVariable(variable) {
	const functionNodes = getFunctionDefinitions(variable),
		isFunctionDefinition = functionNodes.length > 0;
	let rhsNode = null;

	return variable.references.some((ref) => {
		if (isForInRef(ref)) {
			return true;
		}

		const forItself = isReadForItself(ref, rhsNode);

		rhsNode = getRhsNode(ref, rhsNode);

		// console.log('ref: ' + isReadRef(ref));
		// console.log(ref.flag);
		// console.log(ref.flag & 0x1);

		return (
			isReadRef(ref) &&
			!forItself &&
			!(isFunctionDefinition && isSelfReference(ref, functionNodes))
		);
	});
}

/**
 * Gets a list of function definitions for a specified variable.
 * @param {Variable} variable eslint-scope variable object.
 * @returns {ASTNode[]} Function nodes.
 * @private
 */
function getFunctionDefinitions(variable) {
	const functionDefinitions = [];

	variable.defs.forEach((def) => {
		const { type, node } = def;

		// FunctionDeclarations
		if (type === "FunctionName") {
			functionDefinitions.push(node);
		}

		// FunctionExpressions
		if (
			type === "Variable" &&
			node.init &&
			(node.init.type === "FunctionExpression" ||
				node.init.type === "ArrowFunctionExpression")
		) {
			functionDefinitions.push(node.init);
		}
	});
	return functionDefinitions;
}

/**
 * Checks whether a given reference is a read to update itself or not.
 * @param {eslint-scope.Reference} ref A reference to check.
 * @param {ASTNode} rhsNode The RHS node of the previous assignment.
 * @returns {boolean} The reference is a read to update itself.
 * @private
 */
function isReadForItself(ref, rhsNode) {
	const id = ref.identifier;
	const parent = id.parent;

	return (
		ref.isRead() &&
		// self update. e.g. `a += 1`, `a++`
		((parent.type === "AssignmentExpression" &&
			parent.left === id &&
			isUnusedExpression(parent)) ||
			(parent.type === "UpdateExpression" && isUnusedExpression(parent)) ||
			// in RHS of an assignment for itself. e.g. `a = a + 1`
			(rhsNode &&
				isInside(id, rhsNode) &&
				!isInsideOfStorableFunction(id, rhsNode)))
	);
}


/**
 * Determine if an identifier is used either in for-in loops.
 * @param {Reference} ref The reference to check.
 * @returns {boolean} whether reference is used in the for-in loops
 * @private
 */
function isForInRef(ref) {
	let target = ref.identifier.parent;

	if (!target) {
		return false;
	}

	// "for (var ...) { return; }"
	if (target.type === "VariableDeclarator") {
		target = target.parent.parent;
	}

	if (target.type !== "ForInStatement") {
		return false;
	}

	// "for (...) { return; }"
	if (target.body.type === "BlockStatement") {
		target = target.body.body[0];

		// "for (...) return;"
	} else {
		target = target.body;
	}

	// For empty loop body
	if (!target) {
		return false;
	}

	return target.type === "ReturnStatement";
}

function getRhsNode(ref, prevRhsNode) {
	const id = ref.identifier;
	const parent = id.parent;
	const refScope = ref.from.variableScope;
	const varScope = ref.resolved.scope.variableScope;
	const canBeUsedLater = refScope !== varScope || astUtils.isInLoop(id);

	if (!parent) {
		return null;
	}
	/*
	 * Inherits the previous node if this reference is in the node.
	 * This is for `a = a + a`-like code.
	 */
	if (prevRhsNode && isInside(id, prevRhsNode)) {
		return prevRhsNode;
	}

	if (
		parent.type === "AssignmentExpression" &&
		isUnusedExpression(parent) &&
		id === parent.left &&
		!canBeUsedLater
	) {
		return parent.right;
	}
	return null;
}
/**
 * Determines if a reference is a read operation.
 * @param {Reference} ref An eslint-scope Reference
 * @returns {boolean} whether the given reference represents a read operation
 * @private
 */
function isReadRef(ref) {
	return ref.isRead();
}

/**
 * Determine if an identifier is referencing an enclosing function name.
 * @param {Reference} ref The reference to check.
 * @param {ASTNode[]} nodes The candidate function nodes.
 * @returns {boolean} True if it's a self-reference, false if not.
 * @private
 */
function isSelfReference(ref, nodes) {
	let scope = ref.from;

	while (scope) {
		if (nodes.indexOf(scope.block) >= 0) {
			return true;
		}

		scope = scope.upper;
	}

	return false;
}

/**
 * Determines if a given variable is being exported from a module.
 * @param {Variable} variable eslint-scope variable object.
 * @returns {boolean} True if the variable is exported, false if not.
 * @private
 */
function isExported(variable) {
	const definition = variable.defs[0];

	if (definition) {
		let node = definition.node;

		if (node.type === "VariableDeclarator") {
			node = node.parent;
		} else if (definition.type === "Parameter") {
			return false;
		}

		if (!node || !node.parent) {
			return false;
		}


		return node.parent.type.indexOf("Export") === 0;
	}
	return false;
}

/**
 * Determines if a variable has a sibling rest property
 * @param {Variable} variable eslint-scope variable object.
 * @returns {boolean} True if the variable is exported, false if not.
 * @private
 */
function hasRestSpreadSibling(variable) {
	if (config.ignoreRestSiblings) {
		const hasRestSiblingDefinition = variable.defs.some((def) =>
			hasRestSibling(def.name.parent)
		);
		const hasRestSiblingReference = variable.references.some((ref) =>
			hasRestSibling(ref.identifier.parent)
		);

		return hasRestSiblingDefinition || hasRestSiblingReference;
	}

	return false;
}

function isUnusedExpression(node) {
	const parent = node.parent;

	if (parent.type === "ExpressionStatement") {
			return true;
	}

	if (parent.type === "SequenceExpression") {
			const isLastExpression = parent.expressions[parent.expressions.length - 1] === node;

			if (!isLastExpression) {
					return true;
			}
			return isUnusedExpression(parent);
	}

	return false;
}

function isInside(inner, outer) {
	return (
			inner.range[0] >= outer.range[0] &&
			inner.range[1] <= outer.range[1]
	);
}

function isInsideOfStorableFunction(id, rhsNode) {
	const funcNode = astUtils.getUpperFunction(id);

	return (
			funcNode &&
			isInside(funcNode, rhsNode) &&
			isStorableFunction(funcNode, rhsNode)
	);
}

function isStorableFunction(funcNode, rhsNode) {
	let node = funcNode;
	let parent = funcNode.parent;

	while (parent && isInside(parent, rhsNode)) {
			switch (parent.type) {
					case "SequenceExpression":
							if (parent.expressions[parent.expressions.length - 1] !== node) {
									return false;
							}
							break;

					case "CallExpression":
					case "NewExpression":
							return parent.callee !== node;

					case "AssignmentExpression":
					case "TaggedTemplateExpression":
					case "YieldExpression":
							return true;

					default:
							if (/(?:Statement|Declaration)$/u.test(parent.type)) {

									/*
									 * If it encountered statements, this is a complex pattern.
									 * Since analyzing complex patterns is hard, this returns `true` to avoid false positive.
									 */
									return true;
							}
			}

			node = parent;
			parent = parent.parent;
	}

	return false;
}

function hasRestSibling(node) {
	return node.type === "Property" &&
			node.parent.type === "ObjectPattern" &&
			REST_PROPERTY_TYPE.test(node.parent.properties[node.parent.properties.length - 1].type);
}