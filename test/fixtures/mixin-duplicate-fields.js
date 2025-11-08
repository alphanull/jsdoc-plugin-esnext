/**
 * @mixes Mixin
 */
class MixinClass {
  constructor() {
  }
}

/**
 * @mixin
 */
const Mixin = {
  /**
   * A field that should not be duplicated.
   * @type {string}
   */
  field: 'value'
};

export { MixinClass, Mixin };

