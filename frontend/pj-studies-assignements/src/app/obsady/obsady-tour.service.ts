import { Injectable } from '@angular/core';

const TOUR_STORAGE_KEY = 'obsady_tour_completed_v1';

@Injectable({ providedIn: 'root' })
export class ObsadyTourService {

  isFirstVisit(): boolean {
    try {
      return !localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      return false;
    }
  }

  markVisited(): void {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch {
      // localStorage niedostepny (tryb prywatny itp.)
    }
  }
}
