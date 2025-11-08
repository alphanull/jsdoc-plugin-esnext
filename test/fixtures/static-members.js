/**
 * ES6 mixin that contributes static members.
 * @mixin StaticMixin
 */
export class StaticMixin {

    /**
     * Static property that must keep static scope.
     * @type {string}
     */
    static staticProp = 'static';

    /**
     * Static method that must remain static after augmentation.
     * @returns {string}
     */
    static staticMethod() {
        return 'static';
    }
}

/**
 * Class that uses the mixin and defines additional static members.
 * @class StaticConsumer
 * @mixes StaticMixin
 */
export default class StaticConsumer extends StaticMixin {

    /**
     * Class-level static property.
     * @type {number}
     */
    static counter = 1;

    /**
     * Private static state that must be detected.
     * @type {symbol}
     */
    static #token = Symbol('token');
}

