import { initFederation } from '@angular-architects/native-federation';

initFederation().catch(console.error).then(() => import('./bootstrap')).catch(console.error);
