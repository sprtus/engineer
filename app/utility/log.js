const _ = require('lodash');
const colors = require('colors'); // eslint-disable-line no-unused-vars
const config = require('../config');
const lang = require('../lang');
const Table = require('cli-table');

/**
 * Log message
 */
class Message {
  /**
   * Constructor
   * @param {Object} params
   * @return {Message}
   */
  constructor(params = {}) {
    _.merge(this, {
      level: 1,
      content: '',
      key: null,
      tokens: {},
      nl: true,
    }, params);
    return this;
  }
}

/**
 * Logging methods
 */
const Log = {
  /**
   * Temporary storage for suppressed logging
   */
  oldLogLevel: null,
  oldStopOnError: null,

  /**
   * Indentation settings
   */
  indentation: '',
  hanging: false,

  /**
   * Listener for PnP logging
   * @param {LogEntry} entry
   * @return {void}
   */
  listener(entry) {
    if (config.env.logLevel === 0) {
      Log.dump(entry);
    }

    else if (entry.level) {
      // Error
      if (entry.level === 3) {
        if (entry.data && entry.data.responseBody) Log.error({ content: entry.data.responseBody['odata.error'].message.value });
        else Log.error({ content: entry.message });
        if (config.env.stopOnError) Log.fail();
      }

      // Warning
      else if (entry.level === 2) Log.warning({ content: entry.message });

      // Info
      else Log.info({ content: entry.message });
    }
  },

  /**
   * Suppress logging
   * @return {void}
   */
  suppress() {
    Log.oldLogLevel = config.env.logLevel;
    Log.oldStopOnError = config.env.stopOnError;
    config.env.logLevel = 99;
    config.env.stopOnError = false;
  },

  /**
   * Restore suppressed logging
   * @return {void}
   */
  restore() {
    config.env.logLevel = Log.oldLogLevel;
    config.env.stopOnError = Log.oldStopOnError;
  },

  /**
   * End the process
   * @param {Object} params
   * @return {void}
   */
  fail(params = null) {
    if (params !== null) Log.error(params);
    process.exit();
  },

  /**
   * Print to log
   * @param {string} str
   * @param {boolean} nl
   * @return {void}
   */
  print(str, nl = true) {
    process.stdout.write(`${!Log.hanging ? Log.indentation : ''}${str}${nl ? '\n' : ''}`);
    Log.hanging = !nl;
  },

  /**
   * Increase indent
   * @return {void}
   */
  indent() {
    Log.indentation += '  ';
  },

  /**
   * Decrease indentation
   * @param {boolean} reset
   * @return {void}
   */
  outdent(reset = false) {
    if (reset) Log.indentation = '';
    else Log.indentation = Log.indentation.replace(/ {2}$/, '');
  },

  /**
   * Dump to log
   * @param {Object} obj
   * @return {void}
   */
  dump(obj) {
    if (Log.hanging) {
      process.stdout.write('\n');
      Log.hanging = false;
    }
    return console.log(obj);
  },

  /**
   * Log info
   * @param {Object} params
   * @return {void}
   */
  info(params = {}) {
    const msg = new Message(_.merge({ level: 1 }, typeof params === 'object' ? params : { content: params }));
    if (msg.level < config.env.logLevel) return null;
    if (msg.content && typeof msg.content !== 'string') return Log.dump(msg.content);
    return Log.print(msg.key ? Log.translate(msg.key, msg.tokens) : msg.content, msg.nl);
  },

  /**
   * Log warning
   * @param {Object} params
   * @return {void}
   */
  warning(params = {}) {
    const msg = new Message(_.merge({ level: 2 }, typeof params === 'object' ? params : { content: params }));
    if (msg.level < config.env.logLevel) return null;
    if (msg.content && typeof msg.content !== 'string') return Log.dump(msg.content);
    return Log.print(msg.key ? Log.translate(msg.key, msg.tokens).yellow : msg.content.yellow, msg.nl);
  },

  /**
   * Log error
   * @param {Object} params
   * @return {void}
   */
  error(params = {}) {
    const msg = new Message(_.merge({ level: 3 }, typeof params === 'object' ? params : { content: params }));
    if (msg.level < config.env.logLevel) return null;
    if (msg.content && typeof msg.content !== 'string') return Log.dump(msg.content);
    return Log.print(msg.key ? Log.translate(msg.key, msg.tokens).red : msg.content.red, msg.nl);
  },

  /**
   * Get localized language string
   * @param {string} key
   * @param {Object} tokens
   * @return {string}
   */
  translate(key, tokens = {}) {
    const translation = _.get(lang, `${config.env.lang}.${key}`, _.get(lang, `en.${key}`, key));
    if (translation === key) return translation;
    const template = _.template(translation);
    return Log.md(template(tokens));
  },

  /**
   * Process markdown formatting on given string
   * @param {string} str
   * @return {string}
   */
  md(str = '') {
    let md = str;

    // **bold**
    md = md.replace(/\*\*(.*?)\*\*/g, '$1'.bold);

    // [c=color]...[/c]
    md = md.replace(/\[c=(\w+)\](.*?)\[\/c\]/g, (match, $1, $2) => $2[$1]);

    return md;
  },

  /**
   * Log tabular data
   * @param {Array} columns
   * @param {Array} rows
   * @return {void}
   */
  table(rows = []) {
    const table = new Table();
    rows.forEach((row) => {
      table.push(row);
    });
    return Log.dump(table.toString());
  },
};

module.exports = Log;
