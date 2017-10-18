#! /usr/bin/env node

const engineer = require('../app/engineer');
const program = require('commander');
const utility = require('../app/utility');

/**
 * Load configuration when on command
 * @return {Promise}
 */
const config = () => new Promise((resolve) => {
  engineer.load(program.config).then(resolve);
});

// Program
program.version('1.0.0')
  .option('-c, --config <file>', utility.log.translate('config.description'));

// Browse SharePoint
program.command('browse [list]')
  .description(utility.log.translate('browse.description'))
  .action((list) => {
    config().then(engineer.commands.browse.run(list));
  });

// Create GUID
program.command('guid')
  .description(utility.log.translate('guid.description'))
  .action(() => {
    engineer.commands.guid.run();
  });

// Init
program.command('init')
  .description(utility.log.translate('init.description'))
  .action(() => {
    engineer.commands.init.run();
  });

// Install
program.command('install')
  .description(utility.log.translate('install.description'))
  .action(() => {
    config().then(engineer.commands.install.run());
  });

// Make migration
program.command('make <name>')
  .description(utility.log.translate('make.description'))
  .action((name) => {
    config().then(engineer.commands.make.run(name));
  });

// Migrate
program.command('migrate')
  .description(utility.log.translate('migrate.description'))
  .option('-t, --to <file>', utility.log.translate('migrate.to'))
  .option('-o, --only <file>', utility.log.translate('migrate.only'))
  .option('-f, --force', utility.log.translate('migrate.force'))
  .action((options) => {
    config().then(engineer.commands.migrate.run(options));
  });

// Rollback
program.command('rollback')
  .description(utility.log.translate('rollback.description'))
  .option('-t, --to <file>', utility.log.translate('rollback.to'))
  .option('-o, --only <file>', utility.log.translate('migrate.only'))
  .option('-f, --force', utility.log.translate('rollback.force'))
  .action((options) => {
    config().then(engineer.commands.rollback.run(options));
  });

// Status
program.command('status')
  .description(utility.log.translate('status.description'))
  .action(() => {
    config().then(engineer.commands.status.run());
  });

// Uninstall
program.command('uninstall')
  .description(utility.log.translate('uninstall.description'))
  .action(() => {
    config().then(engineer.commands.uninstall.run());
  });

// Parse command
program.parse(process.argv);

// Help
if (!program.args.length) program.help();
