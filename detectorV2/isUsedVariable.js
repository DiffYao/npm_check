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
 * Checks whether a given node is unused expression or not.
 * @param {ASTNode} node The node itself
 * @returns {boolean} The node is an unused expression.
 * @private
 */
function isUnusedExpression(node) {
	const parent = node.parent;

	if (parent.type === "ExpressionStatement") {
		return true;
	}

	if (parent.type === "SequenceExpression") {
		const isLastExpression =
			parent.expressions[parent.expressions.length - 1] === node;

		if (!isLastExpression) {
			return true;
		}
		return isUnusedExpression(parent);
	}

	return false;
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
