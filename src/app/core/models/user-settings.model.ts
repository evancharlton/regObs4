import { GeoHazard } from './geo-hazard.enum';
import { AppMode } from './app-mode.enum';
import { LangKey } from './langKey';
import { TopoMap } from './topo-map.enum';
import { SupportTileStore, SupportTile } from './support-tile.model';

export interface UserSetting {
  appMode: AppMode;
  language: LangKey;
  currentGeoHazard: Array<GeoHazard>;
  observationDaysBack: Array<{ geoHazard: GeoHazard; daysBack: number }>;
  completedStartWizard: boolean;
  supportTiles: Array<SupportTileStore>;
  showMapCenter: boolean;
  showObservations: boolean;
  emailReceipt: boolean;
  topoMap: TopoMap;
  showGeoSelectInfo: boolean;
  useRetinaMap: boolean;
  consentForSendingAnalytics: boolean;
  consentForSendingAnalyticsDialogCompleted: boolean;
  featureToggleDeveloperMode: boolean;
  featureToggeGpsDebug: boolean;
  infoAboutObservationsRecievedTimestamps?: {[name: string]: number};
  infoAboutSupportMapsRecievedTimestamps?: {[name: string]: number};
  infoAboutOfflineSupportMapsRecievedTimestamps?: {[name: string]: number};
}
