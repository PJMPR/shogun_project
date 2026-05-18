import { initFederation } from '@angular-architects/native-federation';

initFederation({
  'mfe-program':      'http://shogun.local:8080/mfe-program/remoteEntry.json',
  'mfe-syllabi':      'http://shogun.local:8080/mfe-syllabi/remoteEntry.json',
  'mfe-assignements': 'http://shogun.local:8080/mfe-assignements/remoteEntry.json',
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
