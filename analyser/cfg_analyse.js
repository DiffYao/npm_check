const CFG = require('../cfg/cfg_builder').CFG;
const Source = require('eslint').SourceCode;
const lodash = require('lodash');
const estraverse = require('estraverse');

function analyse(analyseRes) {

  // 构建CFG
  let cfg = new CFG(new Source(analyseRes.code, analyseRes.ast));
  cfg.Build();

  // 获取CFG照中不可抵达节点
  let unReachableNodeInfo = cfg.getUnreachableNode();
  
  // 对之前AST中提取的依赖信息进行过滤
  let unReachableNodes = lodash(unReachableNodeInfo).reduce(function(res, item) { 
    estraverse.traverse(item.node, {
      enter(node, parent) {
        res.push(node);
      }
    })
    return res;
  }, []);

  let newImportDepInfo = lodash(analyseRes.importDepInfo).filter((item) => {
    return !unReachableNodes.includes(item.node);
  }).value()

  // console.log(lodash(newImportDepInfo).map('name').value())
  // console.log(newImportDepInfo)

  // 返回CFGAnalysis结果
  return {
    ast: analyseRes.ast,
    cfg: cfg,
		code: analyseRes.code,
    filename: analyseRes.filename,
		importDepInfo: newImportDepInfo,
  }
}


exports.analyse = analyse;