module.exports = {
  pwa: {
    name: 'Thunder Class',
    themeColor: '#3f51b5',
    msTileColor: '#2980b9',
    manifestOptions: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      background_color: '#ffffff',
    },
  },

  transpileDependencies: [
    'vuetify',
  ],

  parallel: false,
};
