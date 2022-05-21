const READ = 0x1;
const WRITE = 0x2;
const RW = READ | WRITE;

/**
 * A Reference represents a single occurrence of an identifier in code.
 * @constructor Reference
 */
class Reference {
    constructor(ident, scope, flag, writeExpr, maybeImplicitGlobal, partial, init) {

        /**
         * Identifier syntax node.
         * @member {espreeIdentifier} Reference#identifier
         */
        this.identifier = ident;

        /**
         * Reference to the enclosing Scope.
         * @member {Scope} Reference#from
         */
        this.from = scope;

        /**
         * Whether the reference comes from a dynamic scope (such as 'eval',
         * 'with', etc.), and may be trapped by dynamic scopes.
         * @member {boolean} Reference#tainted
         */
        this.tainted = false;

        /**
         * The variable this reference is resolved with.
         * @member {Variable} Reference#resolved
         */
        this.resolved = null;

        /**
         * The read-write mode of the reference. (Value is one of {@link
         * Reference.READ}, {@link Reference.RW}, {@link Reference.WRITE}).
         * @member {number} Reference#flag
         * @private
         */
        this.flag = flag;
        if (this.isWrite()) {

            /**
             * If reference is writeable, this is the tree being written to it.
             * @member {espreeNode} Reference#writeExpr
             */
            this.writeExpr = writeExpr;

            /**
             * Whether the Reference might refer to a partial value of writeExpr.
             * @member {boolean} Reference#partial
             */
            this.partial = partial;

            /**
             * Whether the Reference is to write of initialization.
             * @member {boolean} Reference#init
             */
            this.init = init;
        }
        this.__maybeImplicitGlobal = maybeImplicitGlobal;
    }

    /**
     * Whether the reference is static.
     * @function Reference#isStatic
     * @returns {boolean} static
     */
    isStatic() {
        return !this.tainted && this.resolved && this.resolved.scope.isStatic();
    }

    /**
     * Whether the reference is writeable.
     * @function Reference#isWrite
     * @returns {boolean} write
     */
    isWrite() {
        return !!(this.flag & Reference.WRITE);
    }

    /**
     * Whether the reference is readable.
     * @function Reference#isRead
     * @returns {boolean} read
     */
    isRead() {
        return !!(this.flag & Reference.READ);
    }

    /**
     * Whether the reference is read-only.
     * @function Reference#isReadOnly
     * @returns {boolean} read only
     */
    isReadOnly() {
        return this.flag === Reference.READ;
    }

    /**
     * Whether the reference is write-only.
     * @function Reference#isWriteOnly
     * @returns {boolean} write only
     */
    isWriteOnly() {
        return this.flag === Reference.WRITE;
    }

    /**
     * Whether the reference is read-write.
     * @function Reference#isReadWrite
     * @returns {boolean} read write
     */
    isReadWrite() {
        return this.flag === Reference.RW;
    }
}

/**
 * @constant Reference.READ
 * @private
 */
Reference.READ = READ;

/**
 * @constant Reference.WRITE
 * @private
 */
Reference.WRITE = WRITE;

/**
 * @constant Reference.RW
 * @private
 */
Reference.RW = RW;

exports.default = Reference;

/* vim: set sw=4 ts=4 et tw=80 : */