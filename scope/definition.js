const Variable = require("./variable.js").Variable;

/**
 * @constructor Definition
 */
class Definition {
    constructor(type, name, node, parent, index, kind) {

        /**
         * @member {string} Definition#type - type of the occurrence (e.g. "Parameter", "Variable", ...).
         */
        this.type = type;

        /**
         * @member {espree.Identifier} Definition#name - the identifier AST node of the occurrence.
         */
        this.name = name;

        /**
         * @member {espree.Node} Definition#node - the enclosing node of the identifier.
         */
        this.node = node;

        /**
         * @member {espree.Node?} Definition#parent - the enclosing statement node of the identifier.
         */
        this.parent = parent;

        /**
         * @member {number?} Definition#index - the index in the declaration statement.
         */
        this.index = index;

        /**
         * @member {string?} Definition#kind - the kind of the declaration statement.
         */
        this.kind = kind;
    }
}

/**
 * @constructor ParameterDefinition
 */
class ParameterDefinition extends Definition {
    constructor(name, node, index, rest) {
        super(Variable.Parameter, name, node, null, index, null);

        /**
         * Whether the parameter definition is a part of a rest parameter.
         * @member {boolean} ParameterDefinition#rest
         */
        this.rest = rest;
    }
}

module.exports = {
    ParameterDefinition,
    Definition
};

/* vim: set sw=4 ts=4 et tw=80 : */
