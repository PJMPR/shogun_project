import { initFederation } from '@angular-architects/native-federation';

initFederation({
  'mfe-program':      `/mfe-program/remoteEntry.json`,
  'mfe-syllabi':      `/mfe-syllabi/remoteEntry.json`,
  'mfe-assignements': `/mfe-assignements/remoteEntry.json`,
  'mfe-users':        `/mfe-users/remoteEntry.json`,
  'mfe-lecturers-assignments': `/mfe-lecturers-assignments/remoteEntry.json`,
  'mfe-schedule':              `/mfe-schedule/remoteEntry.json`,
  'mfe-lecturer-schedule':     `/mfe-lecturer-schedule/remoteEntry.json`,
}, {
  // Changing this deployment tag forces browsers to fetch fresh federation
  // manifests while hashed JavaScript bundles can remain safely immutable.
  cacheTag: 'local-20260814-cockpit-assignments-v11',
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
