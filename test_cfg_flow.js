const
    CFG = require( 'ast-flow-graph' ),
    fs = require( 'fs' ),
    src = fs.readFileSync( './index.js', 'utf8' ),
    cfg = new CFG( src, {
        parser:    {
            loc:          true,
            range:        true,
            comment:      true,
            tokens:       true,
            ecmaVersion:  9,
            sourceType:   'module',
            ecmaFeatures: {
                impliedStrict: true,
                experimentalObjectRestSpread: true
            }
        }
    } );

cfg.generate();     // Generate a CFG for all functions (and main module)
// or for just one function
const graph = cfg.generate( 'my_function' );

// Create all graphs and then get one of them
cfg.generate(); // You only need to do this once.
const myFunc = cfg.by_name( 'my_function' );
// ...
console.log( cfg.toTable() );    // Display all functions as tables
// Create a graph-viz .dot file

console.log( cfg.create_dot( myFunc ) );