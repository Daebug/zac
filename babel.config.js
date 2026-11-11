module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // Lets the Drizzle migration bundle import its .sql files as strings
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  }
}
