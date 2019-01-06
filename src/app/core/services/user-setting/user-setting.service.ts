import { Injectable } from '@angular/core';
import { UserSetting } from '../../models/user-settings.model';
import { TranslateService } from '@ngx-translate/core';
import { GeoHazard } from '../../models/geo-hazard.enum';
import { AppMode } from '../../models/app-mode.enum';
import { settings } from '../../../../settings';
import { NanoSql } from '../../../../nanosql';
import { nSQL } from 'nano-sql';
import { Observable } from 'rxjs';
import { map, take, shareReplay } from 'rxjs/operators';
import { LangKey } from '../../models/langKey';
import { AppCountry } from '../../models/app-country.enum';
import { TopoMap } from '../../models/topo-map.enum';

@Injectable({
  providedIn: 'root'
})
export class UserSettingService {

  // Setting this observable to be a shared instance since
  // UserSettingService is a singleton service.
  // The observable will be shared with many services
  private _userSettingObservable: Observable<UserSetting>;
  private _currentGeoHazardObservable: Observable<GeoHazard[]>;

  get userSettingObservable$() {
    return this._userSettingObservable;
  }

  get currentGeoHazardObservable$() {
    return this._currentGeoHazardObservable;
  }

  constructor(private translate: TranslateService) {
    this._userSettingObservable = this.getUserSettingsAsObservable();
    this._currentGeoHazardObservable = this._userSettingObservable.pipe(
      map((val) => val.currentGeoHazard),
      shareReplay(1));
    this.userSettingObservable$.subscribe((userSetting) => {
      this.translate.use(LangKey[userSetting.language]);
    });
  }

  private getDefaultSettings(): UserSetting {
    return {
      appMode: AppMode.Prod,
      language: LangKey.no,
      country: AppCountry.norway,
      currentGeoHazard: [GeoHazard.Snow],
      observationDaysBack: [
        { geoHazard: GeoHazard.Snow, daysBack: 2 },
        { geoHazard: GeoHazard.Ice, daysBack: 7 },
        { geoHazard: GeoHazard.Dirt, daysBack: 3 },
        { geoHazard: GeoHazard.Water, daysBack: 3 },
      ],
      completedStartWizard: false,
      supportTiles: [],
      showMapCenter: false,
      tilesCacheSize: settings.map.tiles.cacheSize,
      showObservations: true,
      emailReciept: true,
      topoMap: TopoMap.mixArcGisOnline,
    };
  }

  getUserSettings(): Promise<UserSetting> {
    return this.userSettingObservable$.pipe(take(1)).toPromise();
  }

  private getUserSettingsAsObservable(): Observable<UserSetting> {
    return nSQL().observable<UserSetting[]>(() => {
      return nSQL(NanoSql.TABLES.USER_SETTINGS.name).query('select').emit();
    }).toRxJS().pipe(
      map((val: UserSetting[]) => val.length > 0 ? val[0] : this.getDefaultSettings()),
      shareReplay(1)
    );
  }

  async saveUserSettings(userSetting: UserSetting) {
    await nSQL(NanoSql.TABLES.USER_SETTINGS.name).query('upsert', { id: 'usersettings', ...userSetting }).exec();
  }
}
