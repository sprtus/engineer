const Migration = require('../migrate/migration');
const status = require('../migrate/status');
const utility = require('../utility');

module.exports = {
  /**
   * Migration queue
   * @type {Array}
   */
  queue: [],

  /**
   * Migrate to this file name
   * @type {string}
   */
  migrateTo: null,

  /**
   * Steps
   * @type {Number}
   */
  step: null,

  /**
   * Stop!
   * @type {boolean}
   */
  stop: false,

  /**
   * Run pending migrations
   * @param {Object} options
   * @return {void}
   */
  run(options) {
    // Get migration files
    let files = utility.file.readDir('migrations');

    // No migrations
    if (!files || !files.length) {
      utility.log.warning({
        level: 3,
        key: 'migrate.empty',
      });
      utility.log.fail();
    }

    // Migrate to
    if (options.to) {
      this.migrateTo = utility.file.name(options.to, false);
      if (!utility.file.exists(`migrations/${this.migrateTo}.js`)) utility.log.fail({ key: 'migrate.exist', tokens: { file: this.migrateTo } });
    }

    // Only
    if (options.only) {
      const onlyFile = utility.file.name(options.only, false);
      if (!utility.file.exists(`migrations/${onlyFile}.js`)) utility.log.fail({ key: 'migrate.exist', tokens: { file: onlyFile } });
      files = [`${onlyFile}.js`];
    }

    // Step
    if (options.step) {
      const steps = parseInt(options.step, 10);
      if (!steps || steps < 1) utility.log.fail({ key: 'error.step' });
      this.step = steps;
    }

    // Get migration status
    status.get().then(() => {
      // Not installed
      if (!status.installed) {
        utility.log.error({
          level: 3,
          key: 'status.uninstalled',
        });
        utility.log.fail();
      }

      // Queue migrations
      files.forEach((file) => {
        // Get migration name
        const name = `${file.replace(/\.js$/i, '')}`;

        // Not already migrated?
        if ((options.force || !status.history[name] || !status.history[name].Migrated) && (!this.step || this.queue.length < this.step)) {
          // Load migration file
          try {
            const data = require(`${process.cwd()}/migrations/${file}`);
            const migration = new Migration(data);

            // Add to queue
            this.queue.push({
              name,
              migration,
            });
          }
          catch (e) {
            utility.log.fail({
              key: 'error.migrationFile',
              tokens: { file, message: e.message },
            });
          }
        }
      });

      // Nothing to migrate
      if (!this.queue.length) {
        utility.log.warning({
          level: 3,
          key: 'migrate.upToDate',
        });
        utility.log.fail();
      }

      // Run migrations
      this.next().then(() => {
        utility.log.info({
          level: 3,
          key: 'migrate.complete',
        });
      });
    });
  },

  /**
   * Run next migration in queue
   * @return {Promise}
   */
  next() {
    const p = new Promise((resolve) => {
      // No migrations in queue
      if (!this.queue.length || this.stop) resolve();

      // Run next migration
      else {
        const migration = this.queue.shift();
        utility.log.info({
          level: 2,
          key: 'migrate.begin',
          tokens: { name: migration.name },
        });
        utility.log.indent();
        migration.migration.run().then(() => {
          // Update migration status
          status.update(migration.name, true).then(() => {
            utility.log.outdent();
            // Migrate to
            if (this.migrateTo && this.migrateTo === migration.name) {
              this.stop = true;
              resolve();
            }

            // Next
            else {
              this.next().then(() => {
                resolve();
              });
            }
          });
        });
      }
    });
    return p;
  },
};
