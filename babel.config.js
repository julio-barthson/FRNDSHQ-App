module.exports = function (api) {
  api.cache(true);

  return {
    // `nativewind/babel` is what makes `className` work at all: it rewrites
    // imports of `react-native` to `react-native-css/components`, whose
    // wrappers read the class names. Without it every `className` is passed
    // to a plain RN component, which silently ignores it.
    //
    // The preset also supplies `react-native-worklets/plugin`, so it must not
    // be listed separately or it runs twice.
    presets: ['babel-preset-expo', 'nativewind/babel'],
  };
};
