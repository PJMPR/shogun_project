const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'mfe-lecturers-assignments',
  exposes: {
    './Routes': './src/app/remote-entry/entry.routes.ts',
  },
  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
      includeSecondaries: { skip: ['primeng', '@primeuix', 'primeicons'] },
    }),
  },
  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    'chart.js/auto',
    '@angular/cdk/drag-drop',
    '@angular/common/upgrade',
    '@angular/router/upgrade',
    '@angular/upgrade/static',
    'primeng',
    'primeng/',
    'primeicons',
    'primeicons/',
    '@primeuix/',
    '@primeuix/themes',
    '@primeuix/themes/tokens',
    '@primeuix/styled',
    '@primeuix/styles',
    '@primeuix/utils',
    '@primeuix/motion',
  ],
});
