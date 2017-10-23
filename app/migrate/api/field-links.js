const _ = require('lodash');
const bus = require('../bus');
const config = require('../../config');
const csom = require('csom-node');
const Task = require('../task');
const utility = require('../../utility');

/**
 * Field link collection
 * @type {FieldLinks}
 */
class FieldLinks {
  /**
   * Constructor
   * @param {Object} params
   * @return {FieldLinks}
   */
  constructor(params = {}) {
    // Properties
    _.merge(this, {
      $parent: null,
    }, params);

    return this;
  }

  /**
   * Get field links
   * @return {pnp.FieldLinks}
   */
  get() {
    return this.$parent.get().fieldLinks;
  }

  /**
   * Get parent objects to help with CSOM targeting
   * @return {Object}
   */
  getParents() {
    // Parent objects
    const parents = {
      web: this,
      list: null,
    };

    // Iterate parents to find webs and lists
    while (parents.web.$parent) {
      parents.web = parents.web.$parent;
      if (parents.web.constructor.name === 'List') parents.list = parents.web;
      if (parents.web.constructor.name === 'Web') break;
    }

    return parents;
  }

  /**
   * Add field link to content type
   * @param {string} fieldName
   * @return {void}
   */
  add(fieldName) {
    bus.load(new Task((resolve) => {
      // Get parents
      const parents = this.getParents();

      // Connect, then add content type to target
      utility.sharepoint.configureCsom(`${_.trim(config.env.site, '/')}/${_.trim(parents.web.Url, '/')}`).then(() => {
        // Target web or list
        let target = csom.web;

        // Target object
        if (parents.list) target = parents.list.Title ? target.get_lists().getByTitle(parents.list.Title) : target.get_lists().getById(parents.list.Id);

        // Get content type
        const contentType = target.get_contentTypes().getById(this.$parent.id());

        // Get field
        const field = target.get_fields().getByInternalNameOrTitle(fieldName);

        // Add field link
        const fieldLink = new SP.FieldLinkCreationInformation();
        fieldLink.set_field(field);
        const fieldLinks = contentType.get_fieldLinks();
        fieldLinks.add(fieldLink);
        contentType.update(true);

        // Commit
        utility.log.info({
          level: 2,
          key: 'fieldLink.add',
          tokens: { fieldName },
        });
        csom.ctx.executeQueryAsync(() => {
          resolve();
        }, (sender, args) => {
          utility.log.error({ content: args.get_message() });
          resolve();
        });
      });
    }));
  }

  /**
   * Remove field link from content type
   * @param {string} fieldName
   * @return {void}
   */
  remove(fieldName) {
    bus.load(new Task((resolve) => {
      // Get parents
      const parents = this.getParents();

      // Connect, then remove content type from target
      utility.sharepoint.configureCsom(`${_.trim(config.env.site, '/')}/${_.trim(parents.web.Url, '/')}`).then(() => {
        // Target web or list
        let target = csom.web;

        // Target object
        if (parents.list) target = parents.list.Title ? target.get_lists().getByTitle(parents.list.Title) : target.get_lists().getById(parents.list.Id);

        // Get content type
        const contentType = target.get_contentTypes().getById(this.$parent.id());

        // Remove field link
        const fieldLinks = contentType.get_fieldLinks();
        csom.ctx.load(fieldLinks);

        // Commit
        utility.log.info({
          level: 2,
          key: 'fieldLink.remove',
          tokens: { fieldName },
        });
        csom.ctx.executeQueryAsync(() => {
          const allFieldLinks = fieldLinks.getEnumerator();
          while (allFieldLinks.moveNext()) {
            const fieldLink = allFieldLinks.get_current();
            if (fieldLink.get_name() === fieldName) {
              fieldLink.deleteObject();
              break;
            }
          }
          contentType.update(true);
          csom.ctx.executeQueryAsync(() => {
            resolve();
          }, (sender, args) => {
            utility.log.error({ content: args.get_message() });
            resolve();
          });
        }, (sender, args) => {
          utility.log.error({ content: args.get_message() });
          resolve();
        });
      });
    }));
  }
}

module.exports = FieldLinks;