const Sentry = require('@sentry/node');

Sentry.init({
  dsn: "https://466ffbb63ab3255396c8d266e5fa7789@o4511607769989120.ingest.us.sentry.io/4511607784210432",
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.0,
});

module.exports = Sentry;