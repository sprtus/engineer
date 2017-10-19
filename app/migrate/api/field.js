const _ = require('lodash');
const bus = require('../bus');
const config = require('../../config');
const Task = require('../task');

/**
 * Field
 * @type {Field}
 */
class Field {
  /**
   * Constructor
   * @param {Object} params
   * @return {Field}
   */
  constructor(params = {}) {
    // Properties
    _.merge(this, {
      $parent: null,
      Id: null,
      Title: null,
    }, params);

    return this;
  }

  /**
   * Get FieldTypeKind value
   * @param {string} type
   * @return {number}
   */
  static kind(type) {
    return config.sharepoint.fields[type] || 2;
  }

  /**
   * Get SharePoint field type value
   * @param {string} type
   * @return {string}
   */
  static type(type) {
    return `SP.${config.sharepoint.fieldTypeExceptions[type] || `Field${type}`}`;
  }

  /**
   * Get field by ID or title
   * @return {pnp.Field}
   */
  get() {
    if (this.Id) return this.$parent.get().getById(this.Id);
    return this.$parent.get().getByInternalNameOrTitle(this.Title);
  }

  /**
   * Update field
   * @param {Object} params
   * @return {void}
   */
  update(params = {}) {
    // Options
    const options = _.merge({}, params);

    // Update content type
    bus.load(new Task((resolve) => {
      this.get().update(options).then(resolve);
    }));
  }

  /**
   * Delete field
   * @return {void}
   */
  delete() {
    bus.load(new Task((resolve) => {
      this.get().delete().then(resolve);
    }));
  }
}

module.exports = Field;
