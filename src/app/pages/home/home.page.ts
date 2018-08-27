import { Component, AfterViewInit, OnInit, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { Geolocation, Geoposition } from '@ionic-native/geolocation/ngx';
import { Platform, ToastController, NavController, Events } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { UserMarker } from '../../core/helpers/leaflet/user-marker/user-marker';
import { ObservationService } from '../../core/services/observation/observation.service';
import { ObserverSubscriber } from 'nano-sql/lib/observable';
import { OfflineTileLayer } from '../../core/helpers/leaflet/offline-tile-layer/offline-tile-layer';
import * as norwegianBorder from '../../../assets/norway-borders2.json';
import * as leafletPip from '@mapbox/leaflet-pip';
import { settings } from '../../../settings';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { FullscreenToggleComponent } from '../../components/fullscreen-toggle/fullscreen-toggle.component';

const NORWEGIAN_BORDER = L.geoJSON(norwegianBorder.default);

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @ViewChild(FullscreenToggleComponent) fullscreenToggle: FullscreenToggleComponent;
  map: L.Map;
  watchSubscription: Subscription;
  userMarker: UserMarker;
  toast: HTMLIonToastElement;
  followMode = true;
  markerLayer = L.layerGroup();
  observationSubscription: ObserverSubscriber;
  fullscreenSubscription: Subscription;
  markers: Array<{ id: number, marker: L.Marker }>;
  toastDismissTimeout: NodeJS.Timer;
  // TODO: Create one really good custom Layer with fallback to offline/norwegian/open maps
  embeddedMapLayer = this.getEmbeddedMapLayer();
  defaultMapLayer = this.getDefaultMapLayer();
  alternativeMapLayer = this.getAlternativeMapLayer();
  fullscreen = false;

  constructor(private platform: Platform,
    private geolocation: Geolocation,
    private observationService: ObservationService,
    private toastController: ToastController,
    private events: Events,
    private statusBar: StatusBar,
  ) {

    const defaultIcon = L.icon({
      iconUrl: 'leaflet/marker-icon.png',
      shadowUrl: 'leaflet/marker-shadow.png'
    });

    L.Marker.prototype.options.icon = defaultIcon;

    this.markers = [];
    // this.initLoadingToast(); // TODO: Create component instead
  }

  options: L.MapOptions = {
    layers: [
      this.embeddedMapLayer,
      this.defaultMapLayer,
      this.markerLayer,
    ],
    zoom: 13,
    center: L.latLng(59.911197, 10.741059),
    attributionControl: false,
    zoomControl: false,
  };

  getEmbeddedMapLayer() {
    return L.tileLayer(settings.map.tiles.embeddedUrl, {
      name: 'embedded', maxZoom: 9, minZoom: 1,
    });
  }

  getDefaultMapLayer() {
    // tslint:disable-next-line:max-line-length
    return L.tileLayer(settings.map.tiles.defaultMapUrl, {
      name: 'topo', maxZoom: 18, minZoom: 10,
    });
    // return L.tileLayer.wms('http://opencache.statkart.no/gatekeeper/gk/gk.open',
    //   {
    //     layers: 'norgeskart_bakgrunn',
    //     format: 'image/jpg',
    //     transparent: false,
    //     attribution: '© Kartverket',
    //     useCache: true,
    //     minZoom: 10,
    //     maxZoom: 18,
    //   });
  }

  getAlternativeMapLayer() {
    return L.tileLayer(settings.map.tiles.fallbackMapUrl, {
      name: 'open-topo', maxZoom: 18, minZoom: 1,
    });
  }

  initLoadingToast() {
    this.platform.ready().then(() => {
      this.observationService.isLoading.subscribe(async (isLoading) => {
        if (isLoading) {
          if (this.toastDismissTimeout) {
            clearTimeout(this.toastDismissTimeout);
          }
          this.toast = await this.toastController.create({
            message: 'Laster inn observasjoner',
            position: 'bottom',
            translucent: true,
          });
          this.toast.present();
        } else if (this.toast) {
          this.toastDismissTimeout = setTimeout(() => {
            this.toast.dismiss();
          }, 3000);
        }
      });
    });
  }

  async onMapReady(map: L.Map) {
    console.log('[INFO] onMapReady home page');

    this.map = map;
    this.map.on('moveend', () => this.onMapMoved());
    this.map.on('dragstart', () => this.disableFollowMode());

    this.observationSubscription = (await this.observationService.getObservationsAsObservable())
      .filter((regObservations) => regObservations.length > 0)
      // TODO: filter only visible in map bounds?
      .subscribe((regObservations) => {
        this.addMarkersIfNotExists(regObservations);
      });
  }

  private addMarkersIfNotExists(regObservations) {
    regObservations.forEach((regObservation) => {
      const existingMarker = this.markers.find((marker) => marker.id === regObservation.RegId);
      if (!existingMarker) {
        const latLng = L.latLng(regObservation.Latitude, regObservation.Longitude);
        const marker = L.marker(latLng, {});
        marker.addTo(this.markerLayer);
        this.markers.push({ id: regObservation.RegId, marker });
      }
    });
  }

  centerMapToUser() {
    this.followMode = true;
    if (this.userMarker) {
      const currentPosition = this.userMarker.getPosition();
      this.map.panTo(L.latLng(currentPosition.coords.latitude, currentPosition.coords.longitude));
    }
  }

  private async onMapMoved() {
    console.log('map moved');
    const center = this.map.getCenter();
    const isInNorway: boolean = leafletPip.pointInLayer(center, NORWEGIAN_BORDER).length > 0;
    console.log('[INFO] Is in norway: ', isInNorway);
    if (isInNorway) {
      this.useDefaultMapLayer();
    } else {
      this.useAlternativeMapLayer();
    }
  }

  private useAlternativeMapLayer() {
    this.map.removeLayer(this.embeddedMapLayer);
    this.map.removeLayer(this.defaultMapLayer);
    this.alternativeMapLayer = this.getAlternativeMapLayer()
      .addTo(this.map);
  }

  private useDefaultMapLayer() {
    this.map.removeLayer(this.alternativeMapLayer);
    this.embeddedMapLayer = this.getEmbeddedMapLayer().addTo(this.map);
    this.defaultMapLayer = this.getDefaultMapLayer().addTo(this.map);
  }

  private disableFollowMode() {
    this.followMode = false;
  }

  ionViewDidEnter() {

    console.log('[INFO] ionViewDidEnter home page');
    this.events.subscribe('tabs:changed', (tabName: string) => {
      if (tabName === 'home') {
        this.startGeoLocationWatch();
        this.redrawMap();
      } else {
        // Stopping geolocation when map is not visible to save battery
        this.stopGeoLocationWatch();
      }
    });

    this.fullscreenSubscription = this.fullscreenToggle.isFullscreen.subscribe((isFullscreen) => {
      this.fullscreen = isFullscreen;
    });
  }

  private redrawMap() {
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        setTimeout(() => {
          this.map.invalidateSize();
        }, 500);
      }
    }, 0);
  }

  private startGeoLocationWatch() {
    console.log('[INFO] Start watching location changes');
    if (this.watchSubscription === undefined || this.watchSubscription.closed) {
      this.watchSubscription = this.geolocation.watchPosition(
        { maximumAge: 60000, enableHighAccuracy: true }
      )
        .subscribe(
          (data) => this.onPositionUpdate(data),
          (error) => this.onPositionError(error)
        );
    }
  }

  private stopGeoLocationWatch() {
    console.log('[INFO] Stop watching location changes');
    if (this.watchSubscription !== undefined && !this.watchSubscription.closed) {
      this.watchSubscription.unsubscribe();
    }
  }

  private onPositionUpdate(data: Geoposition) {
    if (data.coords && this.map) {
      const latLng = L.latLng({ lat: data.coords.latitude, lng: data.coords.longitude });
      if (!this.userMarker) {
        this.userMarker = new UserMarker(this.map, data);
        this.map.panTo(latLng);
      } else {
        this.userMarker.updatePosition(data);
        if (this.followMode) {
          this.map.panTo(latLng);
        }
      }
    }
  }

  private onPositionError(error: any) {
    // TODO: Handle error
    console.log(error);
  }

  ionViewWillLeave() {
    console.log('[INFO] ionViewWillLeave home page. Unsubscribe listeners');
    this.observationSubscription.unsubscribe();
    this.fullscreenSubscription.unsubscribe();
    this.stopGeoLocationWatch();
    this.events.unsubscribe('tabs:changed');
  }
}