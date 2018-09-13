import { GeoHazard } from './geo-hazard.enum';
import { AppMode } from './app-mode.enum';
import { SupportTile } from './support-tile.model';

export interface UserSetting {
    appMode: AppMode;
    language: 'no' | 'en';
    currentGeoHazard: GeoHazard;
    observationDaysBack: Array<{ geoHazard: GeoHazard, daysBack: number }>;
    completedStartWizard: boolean;
    supportTiles: Array<SupportTile>;
}
