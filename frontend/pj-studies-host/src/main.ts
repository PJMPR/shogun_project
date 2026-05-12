import { initFederation } from '@angular-architects/native-federation';

initFederation({
  'mfe-program':      'http://localhost:4201/remoteEntry.json',
  'mfe-syllabi':      'http://localhost:4202/remoteEntry.json',
  'mfe-assignements': 'http://localhost:4203/remoteEntry.json',
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
