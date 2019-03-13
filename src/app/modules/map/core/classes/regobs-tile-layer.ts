import * as L from 'leaflet';
import { settings } from '../../../../../settings';
import { OfflineMapService } from '../../../../core/services/offline-map/offline-map.service';
import { DataUrlHelper } from '../../../../core/helpers/data-url.helper';
import { BorderHelper } from '../../../../core/helpers/leaflet/border-helper';
import { GeometryObject } from '@turf/turf';
import { MapService } from '../../services/map/map.service';
import { LRUMap } from 'lru_map';

interface ExtendedCoords extends L.Coords {
    fallback: boolean;
}

class RegObsTile extends HTMLImageElement {
    originalCoords?: ExtendedCoords;
    currentCoords?: ExtendedCoords;
    originalSrc: string;
    hasTriedOffline: boolean;
    fallbackZoom?: number;
    fallbackScale?: number;
    constructor() {
        super();
    }
}

export class RegObsTileLayer extends L.TileLayer {

    private _recentlySavedTile: LRUMap<string, boolean>;
    private _url: string;

    constructor(
        url: string,
        options: L.TileLayerOptions,
        private name: string,
        private offlineMapService: OfflineMapService,
        private mapService: MapService,
        private bufferOffline: boolean,
        private excludeBounds?: GeometryObject,
    ) {
        super(url, options);
        this._url = url;
        this._recentlySavedTile = new LRUMap(2000);
    }

    createTile(coords: ExtendedCoords, done: L.DoneCallback): HTMLElement {
        const tile = new Image() as RegObsTile;

        L.DomEvent.on(tile, 'load', L.Util.bind((<any>this)._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', L.Util.bind((<any>this)._tileOnError, this, done, tile));

        tile.crossOrigin = 'anonymous';
        tile.alt = '';
        tile.originalCoords = coords;

        tile.setAttribute('role', 'presentation');

        const url = (<any>this).getTileUrl(coords);
        tile.src = url;
        tile.originalSrc = url;
        tile.id = this.getTileId(coords);

        return tile;
    }

    private getTileId(coords: ExtendedCoords) {
        return `${this.name}_${coords.z}_${coords.x}_${coords.y}`;
    }

    _tileOnLoad(done: L.DoneCallback, tile: RegObsTile) {
        (<any>L.TileLayer.prototype)._tileOnLoad.call(this, done, tile);
        this.saveTileOffline(tile);
    }

    private async saveTileOffline(tile: RegObsTile) {
        if (this.bufferOffline && tile.id && tile.id !== '' && tile.src.startsWith('http')) {
            if (!this._recentlySavedTile.has(tile.id)) {
                this._recentlySavedTile.set(tile.id, true);
                this.mapService.addImageToSaveQueue(DataUrlHelper.getCanvasFromImage(tile));
            }
        }
    }

    _tileOnError(done: L.DoneCallback, tile: RegObsTile, e: Error) {
        if (!tile.hasTriedOffline && tile.id && tile.id !== '') {
            this.offlineMapService.getTileFromDb(tile.id).then((result) => {
                tile.hasTriedOffline = true;
                if (result && result.dataUrl) {
                    const oldSrc = tile.src;
                    tile.src = result.dataUrl;
                    this.fire('tilefallback',
                        {
                            tile: tile,
                            url: tile.originalSrc,
                            urlMissing: oldSrc,
                            urlFallback: result.dataUrl
                        });
                } else {
                    this.tryScaleImage(done, tile, e);
                }
            });
        } else {
            this.tryScaleImage(done, tile, e);
        }
    }

    /**
     * Override _getTiledPixelBounds to buffer tiles outside edges
     */
    _getTiledPixelBounds(center: L.LatLng) {
        const pixelBounds: L.Bounds = (<any>L.GridLayer.prototype)._getTiledPixelBounds.call(this, center);
        const pixelEdgeBuffer = this.getTileSize().multiplyBy(settings.map.tiles.edgeBufferTiles);
        return new L.Bounds(pixelBounds.min.subtract(pixelEdgeBuffer), pixelBounds.max.add(pixelEdgeBuffer));
    }

    _isValidTile(coords: L.Coords) {
        const valid = (<any>L.GridLayer.prototype)._isValidTile.call(this, coords);
        if (!valid) {
            return false;
        }
        if (this.excludeBounds) {
            const tileBounds = (<any>L.GridLayer.prototype)._tileCoordsToBounds.call(this, coords);
            return !BorderHelper.isInside(tileBounds, this.excludeBounds);
        }
        return true;
    }

    private getNewZoomTileUrl(coords: ExtendedCoords) {
        const data = {
            r: L.Browser.retina ? '@2x' : '',
            s: (<any>L.TileLayer.prototype)._getSubdomain.call(this, coords),
            x: coords.x,
            y: coords.y,
            z: coords.z,
        };
        return L.Util.template(this._url, L.Util.extend(data, this.options));
    }

    private tryScaleImage(done: L.DoneCallback, tile: RegObsTile, e: Error) {
        const originalCoords = tile.originalCoords,
            currentCoords: ExtendedCoords = tile.currentCoords = tile.currentCoords || this.createCurrentCoords(originalCoords),
            fallbackZoom = tile.fallbackZoom = (tile.fallbackZoom || originalCoords.z) - 1,
            scale = tile.fallbackScale = (tile.fallbackScale || 1) * 2,
            tileSize = this.getTileSize(),
            style = tile.style;

        // If no lower zoom tiles are available, fallback to errorTile.
        if (fallbackZoom < 1) {
            // console.log('Max fallback reached. Return original error handling');
            return (<any>L.TileLayer.prototype)._tileOnError.call(this, done, tile, e);
        }

        // Modify tilePoint for replacement img.
        currentCoords.z = fallbackZoom;
        currentCoords.x = Math.floor(currentCoords.x / 2);
        currentCoords.y = Math.floor(currentCoords.y / 2);

        // Generate new src path.
        const newUrl = this.getNewZoomTileUrl(currentCoords);
        // Zoom replacement img.
        style.width = (tileSize.x * scale) + 'px';
        style.height = (tileSize.y * scale) + 'px';

        // Compute margins to adjust position.
        const top = (originalCoords.y - currentCoords.y * scale) * tileSize.y;
        style.marginTop = (-top) + 'px';
        const left = (originalCoords.x - currentCoords.x * scale) * tileSize.x;
        style.marginLeft = (-left) + 'px';

        // Crop (clip) image.
        // `clip` is deprecated, but browsers support for `clip-path: inset()` is far behind.
        // http://caniuse.com/#feat=css-clip-path
        style.clip = 'rect(' +
            top +
            'px ' +
            (left + tileSize.x) +
            'px ' +
            (top + tileSize.y) +
            'px ' +
            left +
            'px)';

        tile.src = newUrl;
        tile.id = this.getTileId(currentCoords);
        tile.hasTriedOffline = false;

        this.fire('tilefallback',
            {
                tile: tile,
                url: tile.originalSrc,
                urlMissing: tile.src,
                urlFallback: newUrl
            });
    }

    private createCurrentCoords(originalCoords: L.Coords): ExtendedCoords {
        const currentCoords: ExtendedCoords = (<any>this)._wrapCoords(originalCoords);
        currentCoords.fallback = true;
        return currentCoords;
    }

}
