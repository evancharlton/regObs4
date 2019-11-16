import { Component, OnInit, ViewChild, OnDestroy, NgZone } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { Subscription, combineLatest, Observable } from 'rxjs';
import { ObservationService } from '../../core/services/observation/observation.service';
import { MapItemBarComponent } from '../../components/map-item-bar/map-item-bar.component';
import { MapItemMarker } from '../../core/helpers/leaflet/map-item-marker/map-item-marker';
import { UserSettingService } from '../../core/services/user-setting/user-setting.service';
import { MapComponent } from '../../modules/map/components/map/map.component';
import { RegistrationViewModel } from '../../modules/regobs-api/models';
import { FullscreenService } from '../../core/services/fullscreen/fullscreen.service';
import { LoggingService } from '../../modules/shared/services/logging/logging.service';
import { LeafletClusterHelper } from '../../modules/map/helpers/leaflet-cluser.helper';
import { Router, ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { settings } from '../../../settings';
import { UsageAnalyticsConsentService } from '../../core/services/usage-analytics-consent/usage-analytics-consent.service';
import { RouterPage } from '../../core/helpers/routed-page';
import { GeoPositionService } from '../../core/services/geo-position/geo-position.service';

const DEBUG_TAG = 'HomePage';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage extends RouterPage implements OnInit, OnDestroy {
  @ViewChild(MapItemBarComponent, { static: true }) mapItemBar: MapItemBarComponent;
  @ViewChild(MapComponent, { static: true }) mapComponent: MapComponent;
  private map: L.Map;
  private markerLayer = LeafletClusterHelper.createMarkerClusterGroup({
    spiderfyOnMaxZoom: false,
    zoomToBoundsOnClick: false
  });
  private showGeoSelectSubscription: Subscription;

  fullscreen$: Observable<boolean>;
  mapItemBarVisible = false;
  // tripLogLayer = L.layerGroup();
  selectedMarker: MapItemMarker;
  showMapCenter: boolean;
  showGeoSelectInfo = false;
  dataLoadIds: string[] = [];

  constructor(
    router: Router,
    route: ActivatedRoute,
    private observationService: ObservationService,
    private fullscreenService: FullscreenService,
    private userSettingService: UserSettingService,
    private ngZone: NgZone,
    private loggingService: LoggingService,
    private usageAnalyticsConsentService: UsageAnalyticsConsentService,
    private geoPostionService: GeoPositionService,
  ) {
    super(router, route);
    this.fullscreen$ = this.fullscreenService.isFullscreen$;
  }

  ngOnInit() {
    this.userSettingService.showMapCenter$.pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((val) => {
        this.ngZone.run(() => {
          this.showMapCenter = val;
        });
      });

    this.mapItemBar.isVisible.pipe(takeUntil(this.ngUnsubscribe)).subscribe((isVisible) => {
      this.ngZone.run(() => {
        this.mapItemBarVisible = isVisible;
      });
    });

    this.observationService.dataLoad$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val) => {
      this.ngZone.run(() => {
        this.dataLoadIds = [val];
      });
    });

    this.checkForFirstStartup();

    // this.tripLoggerService.getTripLogAsObservable().subscribe((tripLogItems) => {
    //   this.tripLogLayer.clearLayers();
    //   const latLngs = tripLogItems.map((tripLogItem) => L.latLng({
    //     lat: tripLogItem.latitude,
    //     lng: tripLogItem.longitude
    //   }));
    //   L.polyline(latLngs, { color: 'red', weight: 3 }).addTo(this.tripLogLayer);
    // });
  }

  async checkForFirstStartup() {
    const userSettings = await this.userSettingService.getUserSettings();
    if (userSettings.showGeoSelectInfo) {
      this.showGeoSelectSubscription = this.userSettingService.userSettingObservable$.pipe(
        map((us) => us.showGeoSelectInfo),
        distinctUntilChanged()
      ).subscribe((showGeoSelectInfo) => {
        this.ngZone.run(() => {
          this.showGeoSelectInfo = showGeoSelectInfo;
          if (!this.showGeoSelectInfo) {
            if (this.showGeoSelectSubscription) {
              this.showGeoSelectSubscription.unsubscribe();
            }
            this.showUsageAnalyticsDialog();
          }
        });
      });
    }
  }

  async showUsageAnalyticsDialog() {
    await this.usageAnalyticsConsentService.checkUserDataConsentDialog();
    /// this.mapComponent.startGeoPositionUpdates();
    this.geoPostionService.startTracking();
  }

  onMapReady(leafletMap: L.Map) {
    this.map = leafletMap;
    this.markerLayer.addTo(this.map);
    this.markerLayer.on('clusterclick', (a: any) => {
      const groupLatLng: L.LatLng = a.latlng;
      const currentZoom = this.map.getZoom();
      const newZoom = currentZoom + 2;
      if (newZoom >= settings.map.tiles.maxZoom) {
        a.layer.spiderfy();
      } else {
        this.map.setView(groupLatLng, Math.min(newZoom, settings.map.tiles.maxZoom));
      }
    });
    this.map.on('click', () => {
      if (this.selectedMarker) {
        this.selectedMarker.deselect();
      }
      this.selectedMarker = null;
      this.mapItemBar.hide();
    });
    // TODO: Move this to custom marker layer?
    const observationObservable =
      combineLatest([this.observationService.observations$, this.userSettingService.showObservations$]);
    observationObservable.pipe(takeUntil(this.ngUnsubscribe)).subscribe(([regObservations, showObservations]) => {
      this.redrawObservationMarkers(showObservations ? regObservations : []);
    });
  }

  async onEnter() {
    this.loggingService.debug(`Home page ionViewDidEnter.`, DEBUG_TAG);
    const userSettings = await this.userSettingService.getUserSettings();
    if (userSettings.showGeoSelectInfo) {
      this.loggingService.debug('Display coachmarks, wait with starting geopostion', DEBUG_TAG);
      return;
    }
    this.loggingService.debug(`Activate map updates and GeoLocation`, DEBUG_TAG);
    // this.mapComponent.startGeoPositionUpdates();
    this.geoPostionService.startTracking();
    this.mapComponent.resumeSavingTiles();
    this.mapComponent.redrawMap();
  }

  onLeave() {
    this.loggingService.debug(`Home page onLeave. Disable map updates and GeoLocation`, DEBUG_TAG);
    // this.mapComponent.stopGeoPositionUpdates();
    this.geoPostionService.stopTracking();
    this.mapComponent.pauseSavingTiles();
  }

  // async ionViewDidEnter() {
  // Use tab page workaround from:
  // https://github.com/ionic-team/ionic/issues/15260
  // }

  // ionViewWillLeave() {
  //   this.loggingService.debug(`Home page ionViewWillLeave. Disable map updates and GeoLocation.`, DEBUG_TAG);
  //   this.mapComponent.stopGeoPositionUpdates();
  // }

  // ngOnDestroy(): void {
  //   for (const subscription of this.subscriptions) {
  //     subscription.unsubscribe();
  //   }
  // }

  private redrawObservationMarkers(regObservations: RegistrationViewModel[]) {
    this.markerLayer.clearLayers();
    for (const regObservation of regObservations) {
      const latLng = L.latLng(regObservation.ObsLocation.Latitude, regObservation.ObsLocation.Longitude);
      const marker = new MapItemMarker(regObservation, latLng, {});
      marker.on('click', (event: L.LeafletEvent) => {
        const m: MapItemMarker = event.target;
        if (this.selectedMarker) {
          this.selectedMarker.deselect();
        }

        this.selectedMarker = m;
        m.setSelected();
        this.mapItemBar.show(m.item);
      });
      marker.addTo(this.markerLayer);
    }
  }
}
