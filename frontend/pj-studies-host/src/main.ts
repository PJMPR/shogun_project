import { initFederation } from '@angular-architects/native-federation';

initFederation({
  'mfe-program':      `/mfe-program/remoteEntry.json`,
  'mfe-syllabi':      `/mfe-syllabi/remoteEntry.json`,
  'mfe-assignements': `/mfe-assignements/remoteEntry.json`,
  'mfe-users':        `/mfe-users/remoteEntry.json`,
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
