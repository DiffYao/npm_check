const readdirp = require('readdirp')

var dir = "/Users/diffyao/Code/node_learn/easy_app"


const pkgList = []
// 2) Streams example, non for-await.
// Print out all JS files along with their size within the current folder & subfolders.
const finder = readdirp(dir, {fileFilter: '*.js', alwaysStat: true}) 
finder.on('data', (entry) => {
    console.log(entry.path)  
});