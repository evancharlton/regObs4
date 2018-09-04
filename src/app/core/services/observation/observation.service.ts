import { Injectable } from '@angular/core';
import { settings } from '../../../../settings';
import { RegObsObservation } from '../../models/regobs-observation.model';
import { nSQL, NanoSQLInstance } from 'nano-sql';
import { Observer } from 'nano-sql/lib/observable';
import { ApiService } from '../api/api.service';
import { HelperService } from '../helpers/helper.service';
import { RowCount } from '../../models/row-count.model';
import { Subject, Observable } from 'rxjs';
import { GeoHazard } from '../../models/geo-hazard.enum';
import * as moment from 'moment';
import 'moment-timezone';

const tableName = 'registration';

@Injectable({
  providedIn: 'root'
})
export class ObservationService {

  observations: Array<RegObsObservation>;
  private _isLoading: Subject<boolean>;

  get isLoading(): Observable<boolean> {
    return this._isLoading.asObservable();
  }

  constructor(
    private apiService: ApiService,
    private helperService: HelperService
  ) {
    this._isLoading = new Subject<boolean>();
  }

  init() {
    nSQL(tableName)
      .model([
        { key: 'RegId', type: 'number', props: ['pk'] },
        { key: 'DtObsTime', type: 'date', props: ['idx'] },
        { key: 'GeoHazardTid', type: 'number', props: ['idx'] },
        { key: '*', type: '*' },
      ]);
  }

  async deleteOldObservations() {
    const nickName = 'dummy'; // TODO: get logged in user
    const deleteOldRecordsFrom = moment().subtract(settings.observations.daysBackToKeepBeforeCleanup, 'days').startOf('day');
    return nSQL(tableName).query('delete')
      .where((reg: RegObsObservation) => {
        return moment.tz(reg.DtObsTime, settings.observations.timeZone).isBefore(deleteOldRecordsFrom)
          && reg.NickName !== nickName;
      }).exec();
  }

  async updateObservations() {
    this._isLoading.next(true);
    await this.deleteOldObservations();
    const fromDate = await this.helperService.getObservationsFromDate();
    (await this.apiService.search({
      FromDate: fromDate.toDate()
    })).subscribe(async (next) => {
      await nSQL(tableName).loadJS(tableName, next.Results);
      this._isLoading.next(false);
    });
  }

  // async updateObservations(lat: number, lng: number, radius: number) {
  //   const userSettings = await this.userSettingService.getUserSettings();
  //   const observationRequest: ObservationsWithinRadiusRequest = {
  //     GeoHazards: [userSettings.currentGeoHazard],
  //     Latitude: lat,
  //     Longitude: lng,
  //     Radius: radius,
  //     FromDate: this.getobservationsFromDate(userSettings),
  //     LangKey: userSettings.language,
  //     ReturnCount: settings.observations.maxObservationsToFetch,
  //   };
  //   const baseUrl = settings.services.apiUrl[userSettings.appMode];
  //   await this.getDb();
  //   await this.httpClient.post<RegObsObservation>(
  //     `${baseUrl}/Observations/GetObservationsWithinRadius`, observationRequest)
  //     .subscribe(async (next) => {
  //       await nSQL(tableName).query('upsert', {
  //         RegId: next.RegId,
  //         Latitude: next.Latitude,
  //         Longitude: next.Longitude
  //       }).exec();
  //     });
  // }

  getObservationsAsObservable(geoHazard?: GeoHazard, fromDate?: Date, user?: string): Observer<RegObsObservation[]> {
    return nSQL().observable<RegObsObservation[]>(() => {
      return nSQL(tableName).query('select').where((reg: RegObsObservation) => {
        return geoHazard ? reg.GeoHazardTid === geoHazard : true &&
          fromDate ? moment.tz(reg.DtObsTime, settings.observations.timeZone).isAfter(fromDate) : true &&
            user ? reg.NickName === user : true;
      }).emit();
    });
  }

  getObserableCount(): Observer<RowCount[]> {
    return nSQL().observable<RowCount[]>(() => {
      return nSQL(tableName).query('select', ['COUNT(*) as count']).emit();
    });
  }

  drop() {
    return nSQL(tableName).query('drop').exec();
  }
}
