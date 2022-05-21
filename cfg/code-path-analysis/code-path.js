/**
 * @fileoverview A class of the code path.
 * @author Toru Nagashima
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const CodePathState = require("./code-path-state");
const IdGenerator = require("./id-generator");
const jPipeline = require("json-pipeline");
const dFrontier = require("dominance-frontier");
const lodash = require("lodash");

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

/**
 * A code path.
 */
class CodePath {
	/**
	 * Creates a new instance.
	 * @param {Object} options Options for the function (see below).
	 * @param {string} options.id An identifier.
	 * @param {string} options.origin The type of code path origin.
	 * @param {CodePath|null} options.upper The code path of the upper function scope.
	 * @param {Function} options.onLooped A callback function to notify looping.
	 */
	constructor({ id, origin, upper, onLooped }) {
		/**
		 * The identifier of this code path.
		 * Rules use it to store additional information of each rule.
		 * @type {string}
		 */
		this.id = id;

		/**
		 * The reason that this code path was started. May be "program",
		 * "function", "class-field-initializer", or "class-static-block".
		 * @type {string}
		 */
		this.origin = origin;

		/**
		 * The code path of the upper function scope.
		 * @type {CodePath|null}
		 */
		this.upper = upper;

		/**
		 * The code paths of nested function scopes.
		 * @type {CodePath[]}
		 */
		this.childCodePaths = [];

		this.traverse = this.traverseSegmentsTrue;

		// Initializes internal state.
		Object.defineProperty(this, "internal", {
			value: new CodePathState(new IdGenerator(`${id}_`), onLooped),
		});

		// Adds this into `childCodePaths` of `upper`.
		if (upper) {
			upper.childCodePaths.push(this);
		}

		this.nodes = [];
	}

	/**
	 * Gets the state of a given code path.
	 * @param {CodePath} codePath A code path to get.
	 * @returns {CodePathState} The state of the code path.
	 */
	static getState(codePath) {
		return codePath.internal;
	}

	changeTraverse() {
		this.traverse = this.traverseSegmentsTopo;
	}

	getObject() {
		return {
			id: this.id,
			origin: this.origin,
			uppper: this.upper,
			childCodePaths: this.childCodePaths,
			initialSegment: this.initialSegment,
			finalSegments: this.finalSegments,
			returnedSegments: this.returnedSegments,
			thrownSegments: this.thrownSegments,
			currentSegments: this.currentSegments,
		};
	}

	/**
	 * The initial code path segment.
	 * @type {CodePathSegment}
	 */
	get initialSegment() {
		return this.internal.initialSegment;
	}

	/**
	 * Final code path segments.
	 * This array is a mix of `returnedSegments` and `thrownSegments`.
	 * @type {CodePathSegment[]}
	 */
	get finalSegments() {
		return this.internal.finalSegments;
	}

	/**
	 * Final code path segments which is with `return` statements.
	 * This array contains the last path segment if it's reachable.
	 * Since the reachable last path returns `undefined`.
	 * @type {CodePathSegment[]}
	 */
	get returnedSegments() {
		return this.internal.returnedForkContext;
	}

	/**
	 * Final code path segments which is with `throw` statements.
	 * @type {CodePathSegment[]}
	 */
	get thrownSegments() {
		return this.internal.thrownForkContext;
	}

	/**
	 * Current code path segments.
	 * @type {CodePathSegment[]}
	 */
	get currentSegments() {
		return this.internal.currentSegments;
	}

	/**
	 * Traverses all segments in this code path.
	 *
	 *     codePath.traverseSegments(function(segment, controller) {
	 *         // do something.
	 *     });
	 *
	 * This method enumerates segments in order from the head.
	 *
	 * The `controller` object has two methods.
	 *
	 * - `controller.skip()` - Skip the following segments in this branch.
	 * - `controller.break()` - Skip all following segments.
	 * @param {Object} [options] Omittable.
	 * @param {CodePathSegment} [options.first] The first segment to traverse.
	 * @param {CodePathSegment} [options.last] The last segment to traverse.
	 * @param {Function} callback A callback function.
	 * @returns {void}
	 */
	traverseSegments(options, callback) {
		let resolvedOptions;
		let resolvedCallback;

		if (typeof options === "function") {
			resolvedCallback = options;
			resolvedOptions = {};
		} else {
			resolvedOptions = options || {};
			resolvedCallback = callback;
		}

		const startSegment = resolvedOptions.first || this.internal.initialSegment;
		const lastSegment = resolvedOptions.last;

		let item = null;
		let index = 0;
		let end = 0;
		let segment = null;
		const visited = Object.create(null);
		const stack = [[startSegment, 0]];
		let skippedSegment = null;
		let broken = false;
		const controller = {
			skip() {
				if (stack.length <= 1) {
					broken = true;
				} else {
					skippedSegment = stack[stack.length - 2][0];
				}
			},
			break() {
				broken = true;
			},
		};

		/**
		 * Checks a given previous segment has been visited.
		 * @param {CodePathSegment} prevSegment A previous segment to check.
		 * @returns {boolean} `true` if the segment has been visited.
		 */
		function isVisited(prevSegment) {
			return (
				visited[prevSegment.id] || segment.isLoopedPrevSegment(prevSegment)
			);
		}

		while (stack.length > 0) {
			item = stack[stack.length - 1];
			segment = item[0];
			index = item[1];

			if (index === 0) {
				// Skip if this segment has been visited already.
				if (visited[segment.id]) {
					stack.pop();
					continue;
				}

				// Skip if all previous segments have not been visited.
				if (
					segment !== startSegment &&
					segment.prevSegments.length > 0 &&
					!segment.prevSegments.every(isVisited)
				) {
					stack.pop();
					continue;
				}

				// Reset the flag of skipping if all branches have been skipped.
				if (
					skippedSegment &&
					segment.prevSegments.indexOf(skippedSegment) !== -1
				) {
					skippedSegment = null;
				}
				visited[segment.id] = true;

				// Call the callback when the first time.
				if (!skippedSegment) {
					resolvedCallback.call(this, segment, controller);
					if (segment === lastSegment) {
						controller.skip();
					}
					if (broken) {
						break;
					}
				}
			}

			// Update the stack.
			end = segment.nextSegments.length - 1;
			if (index < end) {
				item[1] += 1;
				stack.push([segment.nextSegments[index], 0]);
			} else if (index === end) {
				item[0] = segment.nextSegments[index];
				item[1] = 0;
			} else {
				stack.pop();
			}
		}
	}

	traverseSegmentsTrue(options, callback) {
		let resolvedOptions;
		let resolvedCallback;

		if (typeof options === "function") {
			resolvedCallback = options;
			resolvedOptions = {};
		} else {
			resolvedOptions = options || {};
			resolvedCallback = callback;
		}

		const startSegment = resolvedOptions.first || this.internal.initialSegment;
		const lastSegment = resolvedOptions.last;

		let item = null;
		let index = 0;
		let end = 0;
		let segment = null;
		const visited = Object.create(null);
		const stack = [[startSegment, 0]];
		let skippedSegment = null;
		let broken = false;
		const controller = {
			skip() {
				if (stack.length <= 1) {
					broken = true;
				} else {
					skippedSegment = stack[stack.length - 2][0];
				}
			},
			break() {
				broken = true;
			},
		};

		/**
		 * Checks a given previous segment has been visited.
		 * @param {CodePathSegment} prevSegment A previous segment to check.
		 * @returns {boolean} `true` if the segment has been visited.
		 */
		function isVisited(prevSegment) {
			return (
				visited[prevSegment.id] || segment.isLoopedPrevSegment(prevSegment)
			);
		}

		while (stack.length > 0) {
			item = stack[stack.length - 1];
			segment = item[0];
			index = item[1];

			if (index === 0) {
				// Skip if this segment has been visited already.
				if (visited[segment.id]) {
					stack.pop();
					continue;
				}

				// Skip if all previous segments have not been visited.
				if (
					segment !== startSegment &&
					segment.prevSegments.length > 0 &&
					!segment.prevSegments.every(isVisited)
				) {
					stack.pop();
					continue;
				}

				// Reset the flag of skipping if all branches have been skipped.
				if (
					skippedSegment &&
					segment.prevSegments.indexOf(skippedSegment) !== -1
				) {
					skippedSegment = null;
				}
				visited[segment.id] = true;

				// Call the callback when the first time.
				if (!skippedSegment) {
					resolvedCallback.call(this, segment, controller);
					if (segment === lastSegment) {
						controller.skip();
					}
					if (broken) {
						break;
					}
				}
			}

			// Update the stack.
			end = segment.allNextSegments.length - 1;
			if (index < end) {
				item[1] += 1;
				stack.push([segment.allNextSegments[index], 0]);
			} else if (index === end) {
				item[0] = segment.allNextSegments[index];
				item[1] = 0;
			} else {
				stack.pop();
			}
		}
	}

	buildDominartorTree() {
		let pipeline = jPipeline.create("dominance");
		let nodes = {};
		function toNode(segment) {
			if (!nodes.hasOwnProperty(segment.id)) {
				nodes[segment.id] = pipeline.block();
				// just for debuggging
				nodes[segment.id].label = segment.id;
			}
			return nodes[segment.id];
		}

		// 初始化源节点
		toNode(this.finalSegments[0]);

		// console.log(this.getObject());
		this.traverseSegmentsTrue(function (segment) {
			let parent = toNode(segment);
			let seccessors = segment.allPrevSegments.map(toNode);
			seccessors.forEach((succ) => {
				parent.jump(succ);
			});

			// console.log(
			// 	parent.label + ": " + parent.successors.map((succ) => succ.label)
			// );
		});
		let frontier = dFrontier.create(pipeline);
		frontier.compute();

		// console.log(stringify(pipeline));
		return lodash(pipeline.blocks).reduce(function (res, block) {
			res = res || {};
			res[block.label] = block;
			return res;
		}, {});
	}

	getPostOrder() {
		let visited = new Set();
		let initialSegment = this.internal.initialSegment;
		let postOrder = [];
		let dominartorTree = this.buildDominartorTree();
		traverse(initialSegment);

		function traverse(segment) {
			if (visited.has(segment.id)) {
				return;
			}
			visited.add(segment.id);
			// 接下来需要遍历的segment
			let latetraverse = [];

			segment.allNextSegments.forEach((nextSegment) => {
				// 如果支配
				if (!visited.has(nextSegment.id) && dominartorTree[nextSegment.id] && dominartorTree[segment.id] && dominartorTree[nextSegment.id].dominates(dominartorTree[segment.id])) {
					latetraverse.push(nextSegment);
				}
			});

			segment.allNextSegments.forEach((nextSegment) => {
				// 如果循环
				if (dominartorTree[nextSegment.id] 
					&& dominartorTree[nextSegment.id].loopDepth > 0
					&& !latetraverse.includes(nextSegment)) {
					latetraverse.push(nextSegment);
				}
			});

			segment.allNextSegments.forEach((nextSegment) => {
				if (!visited.has(nextSegment.id) && !latetraverse.includes(nextSegment)) {
					latetraverse.push(nextSegment);
				}
			});

			latetraverse.forEach((late) => {
				traverse(late);
			});

			postOrder.push(segment);
		}

		return postOrder;
	}

	traverseSegmentsTopo(callback) {
		let postOrder = this.getPostOrder();
		postOrder.reverse().forEach((segment) => {
			callback.call(this, segment);
		});
		return;
	}
}

function stringify(p) {
  var list = p.blocks.slice().sort(function(a, b) {
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

  var idom = list.filter(function(item) {
    return item.children && item.children.length !== 0;
  }).map(function(item) {
    return '  ' + item.label + ' -> ' + item.children.map(function(item) {
      return item.label;
    }).sort().join(', ');
  }).join('\n');

  var df = list.filter(function(item) {
    return item.frontier && item.frontier.length !== 0;
  }).map(function(item) {
    return '  ' + item.label + ' -> ' + item.frontier.map(function(item) {
      return item.label;
    }).sort().join(', ');
  }).join('\n');

  var hasLoops = false;
  var depth = list.map(function(item) {
    if (item.loopDepth)
      hasLoops = true;
    return '  ' + item.label + ' : ' + item.loopDepth;
  }).join('\n');

  var out = 'IDOM:\n' + idom + '\nDF:\n' + df;
  if (hasLoops)
    out += '\nDEPTH:\n' + depth;
  return out;
}

module.exports = CodePath;
