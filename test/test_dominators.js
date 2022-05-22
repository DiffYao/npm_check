const AST = require("../analyser/ast_analyse");
const CFG = require("../analyser/cfg_analyse");
const jPipeline = require('json-pipeline');
const dFrontier = require('dominance-frontier');
const lodash = require('lodash');

async function test() {
	filename = "/Users/diffyao/Code/node_learn/npm_check/easy_app/index11.js";

	let astAnalyseRes = await AST.analyse(filename);

	if (astAnalyseRes.error) {
		console.log(astAnalyseRes.error)
		return;
	}
	// 构建cfg
	let cfgAnalyseRes = CFG.analyse(astAnalyseRes);

  let pipeline = cfgAnalyseRes.cfg.codePaths[1].buildDominartorTree()

  console.log(cfgAnalyseRes.cfg.codePaths[1].traverseSegmentsTopo((segment) => {
    console.log(segment.id);
  }));
  
  // let tree = lodash(pipeline.blocks).reduce(function(res, block) {
  //   res = res || {};
  //   res[block.label] = block;
  //   return res;
  // }, {});

  // console.log(tree['s1_6'].dominates(tree['s1_2']));

  // console.log(stringify(pipeline));
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

test();



