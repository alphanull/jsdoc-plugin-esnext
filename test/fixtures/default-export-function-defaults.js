/**
 * Returns a greeting message.
 * @param {string} [name='default_value'] - Target name.
 * @returns {string}
 */
export default function greet(name = 'default_value') {
    return `Hello, ${name}!`;
}

