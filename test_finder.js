const readdirp = require('readdirp')

var dir = "/Users/diffyao/Code/node_learn/easy_app"
const finder = readdirp(dir)

// 2) Streams example, non for-await.
// Print out all JS files along with their size within the current folder & subfolders.
readdirp('.', {fileFilter: '*.js', alwaysStat: true})
  .on('data', (entry) => {
    const {path, stats: {size}} = entry;
    console.log(`${JSON.stringify({path, size})}`);
  })
  // Optionally call stream.destroy() in `warn()` in order to abort and cause 'close' to be emitted
  .on('warn', error => console.error('non-fatal error', error))
  .on('error', error => console.error('fatal error', error))
  .on('end', () => console.log('done'));