const { locales, defaultLocale } = require('./src/i18n');

module.exports = {
  // These are all the locales you want to support
  locales,
  
  // This is the default locale you want to be used when visiting
  // a non-locale prefixed path e.g. `/hello`
  defaultLocale,
  
  // Configure logging
  logging: {
    level: "warn"
  }
}; 