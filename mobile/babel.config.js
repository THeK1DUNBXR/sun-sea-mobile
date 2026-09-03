module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WatermelonDB models use decorators (@field, @date, @json …)
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Reanimated / worklets must be last
      'react-native-worklets/plugin',
    ],
  };
};
