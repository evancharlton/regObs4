import * as L from 'leaflet';
import { settings } from '../../../../settings';
import { Observable, Observer, of } from 'rxjs';
import { createWorker } from 'typed-web-workers';
import { map } from 'rxjs/operators';
import { booleanContains, bboxPolygon, GeometryObject } from '@turf/turf';

// export const NORWEGIAN_BORDER = require('../../../../assets/json/norway-borders.json');
export const SVALBARD_BOUNDS =
    L.latLngBounds(settings.map.elevation.svalbard.bbox.map((coordinate) => L.latLng(coordinate[0], coordinate[1])));
// export const NORWEGIAN_BOUNDS = L.geoJSON(NORWEGIAN_BORDER).getBounds();
export const NORWEGIAN_BOUNDS = require('../../../../assets/json/world-topo-mix-border.json');

export class BorderHelper {

    static isInSvalbard(latLng: L.LatLng, bounds = SVALBARD_BOUNDS) {
        return bounds.contains(latLng);
    }

    static getLatLngBoundInSvalbardOrNorwayAsObservable(latLng: L.LatLng) {
        return BorderHelper.isInSvalbard(latLng) ? of(({ inSvalbard: true, inNorway: true }))
            : BorderHelper.isLatLngInNorwayAsObservable(latLng)
                .pipe(map((inNorway) => ({ inSvalbard: false, inNorway })));
    }

    static isLatLngInNorwayAsObservable(latLng: L.LatLng, border = NORWEGIAN_BOUNDS): Observable<boolean> {
        return Observable.create((observer: Observer<boolean>) => {
            const typedWorker = createWorker(this.isLatLngInNorwayWorkFunc, (msg) => {
                observer.next(msg);
                observer.complete();
            });
            const input = {
                baseUrl: document.location.protocol + '//' + document.location.host,
                latLng: { lat: latLng.lat, lng: latLng.lng },
                border: border.features[0].geometry
            };
            typedWorker.postMessage(input);
            return () => typedWorker ? typedWorker.terminate() : null;
        });
    }

    static isLatLngInNorwayWorkFunc(
        input: {
            baseUrl: string;
            latLng: { lat: number, lng: number };
            border: GeometryObject;
        },
        callback: (_: boolean) => void) {
        const that = <any>self;
        that.importScripts(`${input.baseUrl}/turf/turf.min.js`);
        const result = that.turf.inside([input.latLng.lng, input.latLng.lat], input.border);
        callback(result);
    }

    static toBBox(latLngBounds: L.LatLngBounds): [number, number, number, number] {
        return [
            latLngBounds.getSouthWest().lng, // minx
            latLngBounds.getSouthWest().lat, // miny
            latLngBounds.getNorthEast().lng, // maxx
            latLngBounds.getNorthEast().lat, // maxy
        ];
    }

    static isInside(latLngBounds: L.LatLngBounds, geometry: GeometryObject) {
        return booleanContains(geometry, bboxPolygon(this.toBBox(latLngBounds)));
    }
}
