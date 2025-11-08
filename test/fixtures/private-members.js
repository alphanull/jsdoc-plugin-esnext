/**
 * Demonstrates private members that should be recognized by the plugin.
 * @class PrivateExample
 */
export default class PrivateExample {

    /**
     * Tracks whether the class was initialized.
     * This field intentionally lacks an initializer so the constructor assignment is relevant.
     * @type {boolean}
     */
    #initialized;

    /**
     * Tracks the number of created instances.
     * This property must stay static.
     * @type {number}
     */
    static #instanceCount = 0;

    /**
     * Example of a private arrow-bound handler.
     * Should be recognized as kind `function`.
     */
    #handleClick = () => {
        return this.#increment();
    };

    constructor() {
        this.#initialized = false;
        this.#handleClick();
    }

    /**
     * Increments the private counter.
     * Needs correct private naming.
     * @returns {number}
     */
    #increment() {
        this.#initialized = true;
        return ++PrivateExample.#instanceCount;
    }
}

