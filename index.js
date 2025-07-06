/**
 * JSDoc plugin that recovers and standardizes documentation of ECMAScript-next features:
 * - Native private methods (#method())
 * - Native private properties (#property)
 * - Bound arrow functions (#method = () => {})
 * It injects missing @function and @private tags where necessary and formats the resulting doclets consistently.
 * @author  Frank Kudermann @ alphanull
 * @version 1.0.0
 * @license MIT
 */
export const handlers = {

    /**
     * Triggered when a symbol (e.g. Method or field) is found during AST traversal.
     * Used to recover names for private class members and inline assignments to `this.#foo`.
     * @param {Object} e  The event containing symbol data and AST node information.
     */
    symbolFound(e) {

        // Phase 1: Detect native private methods defined via #method() syntax
        if (e.code?.type === 'MethodDefinition'
          && e.code?.node?.key?.type === 'PrivateName'
          && e.code?.node?.key?.id?.name) {

            e.code.name = e.code.node.key.id.name;
        }

        // Phase 2: Detect assignments to this.#property inside constructor or methods
        if (e.code?.name === 'this.' // <- smells like a jsdoc parse bug
          && e.astnode?.type === 'AssignmentExpression'
          && e.astnode?.left?.type === 'MemberExpression'
          && e.astnode?.left?.property?.type === 'PrivateName'
          && e.astnode?.left?.property?.id?.name) {

            e.code.name = e.astnode.left.property.id.name;
        }
    },

    /**
     * Triggered after all doclets have been collected. Used to finalize name formatting,
     * unify access levels, and merge scattered information into clean private member entries.
     * @param {Object}        context          The parse context object.
     * @param {Array<Object>} context.doclets  The list of all generated doclets.
     */
    parseComplete({ doclets }) {

        const privatePropNames = new Set();

        // Phase 1: Collect names of undocumented ClassPrivateProperty placeholders
        for (const doclet of doclets) {
            if (doclet.undocumented && doclet.meta?.code?.type === 'ClassPrivateProperty') {
                privatePropNames.add(doclet.name);
            }
        }

        // Phase 2: Apply corrections for all relevant doclets
        for (const doclet of doclets) {

            // Handle value-carrying assignment doclets related to private properties
            if (doclet.kind === 'member'
              && doclet.scope === 'inner'
              && typeof doclet.name === 'string'
              && privatePropNames.has(doclet.name)) {

                doclet.name = `#${doclet.name}`;
                doclet.longname = `${doclet.memberof}#${doclet.name}`;
                doclet.access = 'private';
                doclet.scope = 'instance';
                // Do NOT reset undocumented = false here, placeholder doclets must remain hidden
            }

            // correct arrow methods by fixing the kind

            const isArrowMethod = doclet.kind === 'member'
              && (doclet.meta?.code?.type === 'ArrowFunctionExpression'
                || doclet.meta?.code?.node?.value?.type === 'ArrowFunctionExpression');

            if (isArrowMethod) {
                doclet.kind = 'function';
            }

            const isPrivateMethod = doclet.meta?.code?.node?.type === 'MethodDefinition'
              && doclet.meta?.code?.node?.key?.type === 'PrivateName';

            const isPrivateProperty = doclet.meta?.code?.type === 'ClassPrivateProperty'
              || doclet.meta?.code?.node?.type === 'PropertyDefinition'
              && doclet.meta?.code?.node?.key?.type === 'PrivateName';

            if (isPrivateMethod || isPrivateProperty) {

                // Common logic for private methods and properties with recognizable AST nodes

                if (!doclet.name.startsWith('#')) {
                    doclet.name = `#${doclet.name}`;
                }

                if (!doclet.longname || doclet.longname === doclet.memberof) {
                    doclet.longname = `${doclet.memberof}#${doclet.name}`;
                }

                doclet.access = 'private';
            }

            if (doclet.meta?.code?.node?.static === true) {
                doclet.scope = 'static';
            }
        }
    }
};
