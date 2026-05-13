import { initFederation } from '@angular-architects/native-federation';

initFederation({
  'mfe-program':      'http://shogun.local/mfe-program/remoteEntry.json',
  'mfe-syllabi':      'http://shogun.local/mfe-syllabi/remoteEntry.json',
  'mfe-assignements': 'http://shogun.local/mfe-assignements/remoteEntry.json',
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
