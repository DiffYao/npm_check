/**
 * A Variable represents a locally scoped identifier. These include arguments to
 * functions.
 * @constructor Variable
 */
class Variable {
    constructor(name, scope) {

        /**
         * The variable name, as given in the source code.
         * @member {string} Variable#name
         */
        this.name = name;

        /**
         * List of defining occurrences of this variable (like in 'var ...'
         * statements or as parameter), as AST nodes.
         * @member {espree.Identifier[]} Variable#identifiers
         */
        this.identifiers = [];

        /**
         * List of {@link Reference|references} of this variable (excluding parameter entries)
         * in its defining scope and all nested scopes. For defining
         * occurrences only see {@link Variable#defs}.
         * @member {Reference[]} Variable#references
         */
        this.references = [];

        /**
         * List of defining occurrences of this variable (like in 'var ...'
         * statements or as parameter), as custom objects.
         * @member {Definition[]} Variable#defs
         */
        this.defs = [];

        this.tainted = false;

        /**
         * Whether this is a stack variable.
         * @member {boolean} Variable#stack
         */
        this.stack = true;

        /**
         * Reference to the enclosing Scope.
         * @member {Scope} Variable#scope
         */
        this.scope = scope;
    }
}

Variable.CatchClause = "CatchClause";
Variable.Parameter = "Parameter";
Variable.FunctionName = "FunctionName";
Variable.ClassName = "ClassName";
Variable.Variable = "Variable";
Variable.ImportBinding = "ImportBinding";
Variable.ImplicitGlobalVariable = "ImplicitGlobalVariable";

exports.Variable = Variable;


