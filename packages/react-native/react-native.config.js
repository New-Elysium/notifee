module.exports = {
  dependency: {
    platforms: {
      android: {
        packageName: 'io.invertase.notifee',
        packageImportPath: 'import io.invertase.notifee.NotifeePackage;',
        packageInstance: 'new NotifeePackage()',
      },
      ios: {},
    },
  },
};
