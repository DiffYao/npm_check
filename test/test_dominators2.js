const jPipeline = require('json-pipeline');
const dFrontier = require('dominance-frontier');


function test() {
  let nodes = {};
  let pipeline = jPipeline.create('dominance'); 
  function toNode(node) {
    if (!nodes.hasOwnProperty(node)) {
      nodes[node] = pipeline.block();
      // just for debuggging
      nodes[node].label = node;
    }
    return nodes[node];
  }

  toNode(1).jump(toNode(2));
  toNode(2).jump(toNode(3));
  toNode(2).jump(toNode(6));
  toNode(3).jump(toNode(5));
  toNode(4).jump(toNode(5));
  toNode(5).jump(toNode(2));

    
  let frontier = dFrontier.create(pipeline);
  frontier.compute();

  console.log(stringify(pipeline));
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


test()