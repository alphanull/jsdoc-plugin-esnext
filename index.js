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
     * Also fixes ES6 default export names during parsing.
     * @param {Object} e  The event containing symbol data and AST node information.
     */
    symbolFound(e) {

        // Phase 1: Fix ES6 default export names during parsing
        if (e.code?.name === 'module.exports' && (e.code?.type === 'ClassDeclaration' || e.code?.type === 'FunctionDeclaration' || e.code?.type === 'ObjectExpression')) {
            // Check if this is a default export by looking at the parent node
            if (e.astnode?.parent?.type === 'ExportDefaultDeclaration') {
                const exportName = e.astnode.parent.declaration.id?.name;
                if (exportName) {
                    e.code.name = exportName;
                } else if (e.code?.type === 'FunctionDeclaration' && !e.astnode.parent.declaration.id) {
                    // For anonymous functions, generate a descriptive name
                    e.code.name = 'anonymousFunction';
                } else if (e.code?.type === 'ObjectExpression') {
                    // For object literals, try to extract name from JSDoc @type annotation
                    // This will be handled in parseComplete
                    e.code.name = 'defaultExport';
                }
            }
        }

        // Phase 1.5: Fix class member relationships during parsing
        if (e.code?.type === 'MethodDefinition' && e.astnode?.parent?.type === 'ClassBody') {
            // This is a class method, ensure it has the correct parent reference
            const parentClass = e.astnode.parent.parent;
            if (parentClass?.type === 'ClassDeclaration' && parentClass.id?.name) {
                // The method should be linked to the class name, not module.exports
                e.code.memberof = parentClass.id.name;
                e.code.scope = 'instance';
            }
        }

        // Phase 2: Detect native private methods defined via #method() syntax
        if (e.code?.type === 'MethodDefinition'
          && e.code?.node?.key?.type === 'PrivateName'
          && e.code?.node?.key?.id?.name) {

            e.code.name = e.code.node.key.id.name;
        }

        // Phase 3: Detect assignments to this.#property inside constructor or methods
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

        // Phase 3: Fix default export names in doclets (simple approach)
        for (const doclet of doclets) {
            // Fix default export function names
            if (doclet.kind === 'function' && doclet.name === 'exports' && doclet.memberof === 'module') {
                // Find the actual function name from the doclets
                const funcDoclet = doclets.find(d => d.kind === 'function' && d.name !== 'exports' && d.scope === 'global');
                if (funcDoclet) {
                    doclet.name = funcDoclet.name;
                    doclet.longname = funcDoclet.name;
                    doclet.memberof = undefined;
                }
            }

            // Fix default export object literals
            if (doclet.kind === 'member' && doclet.name === 'exports' && doclet.memberof === 'module' &&
                doclet.meta?.code?.type === 'ObjectExpression') {
                // Try to extract name from JSDoc @type annotation
                const typeMatch = doclet.description?.match(/@type\s*\{([^}]+)\}/);
                const objectName = typeMatch?.[1]?.trim() ||
                    doclet.meta?.code?.node?.properties?.[0]?.key?.name + 'Config' ||
                    'defaultExport';

                doclet.name = objectName;
                doclet.longname = objectName;
                doclet.memberof = undefined;
            }

            // Fix class methods that got marked as global
            if (doclet.kind === 'function' && doclet.scope === 'global' &&
                doclet.meta?.code?.node?.type === 'MethodDefinition') {
                // Find the class name
                const classDoclet = doclets.find(d => d.kind === 'class' && d.name !== 'exports');
                if (classDoclet) {
                    doclet.scope = 'instance';
                    doclet.memberof = classDoclet.name;
                    doclet.longname = `${classDoclet.name}#${doclet.name}`;
                    doclet.id = doclet.longname; // Also fix the id to ensure proper HTML linking
                }
            }
        }

    }
};
