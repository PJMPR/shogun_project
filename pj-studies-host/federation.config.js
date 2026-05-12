const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'shell',
  remotes: {
    'mfe-program':      'http://localhost:4201',
    'mfe-syllabi':      'http://localhost:4202',
    'mfe-assignements': 'http://localhost:4203',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    'chart.js/auto',
    '@angular/cdk/drag-drop',
    '@primeuix/themes',
  ],
});
