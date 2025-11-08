/**
 * Exported as default class.
 */
export default class FooClass {
    /**
     * FooClass constructor.
     * @param {string} message - Additional message.
     */
    constructor(message) {
        this.message = message;
    }

    /**
     * This is a class method.
     * @param {any} someArg - An arg you need to pass.
     */
    classMethod(someArg) {
        return `${this.message}-${someArg}`;
    }
}
