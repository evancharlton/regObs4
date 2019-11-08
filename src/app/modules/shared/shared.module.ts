import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ObservationListCardComponent } from '../../components/observation/observation-list-card/observation-list-card.component';
import { ImgSwiperComponent } from '../../components/img-swiper/img-swiper.component';
import { RouterModule } from '@angular/router';
import { SummaryComponent } from '../../components/observation/summary/summary.component';
import { ObservationSkeletonComponent } from '../../components/observation/observation-skeleton/observation-skeleton.component';
import { SelectComponent } from './components/input/select/select.component';
import { GeoFabComponent } from './components/geo-fab/geo-fab.component';
import { GeoNameComponent } from './components/geo-name/geo-name.component';
import { GeoSelectComponent } from './components/geo-select/geo-select.component';
import { FormatDatePipe } from './pipes/format-date/format-date.pipe';
import { HeaderColorDirective } from './directives/header-color/header-color.directive';
import { ShadowCssDirective } from './directives/shadow-css/shadow-css.directive';
import { GeoIconComponent } from './components/geo-icon/geo-icon.component';
import { AddMenuComponent } from './components/add-menu/add-menu.component';
import { ExternalLinkComponent } from './components/external-link/external-link.component';
import { RefreshWithCancelComponent } from './components/refresh-with-cancel/refresh-with-cancel.component';
import { HeaderComponent } from './components/header/header.component';
import { OfflineImageComponent } from './components/offline-image/offline-image.component';
import { MapModule } from '../map/map.module';
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonicModule,
        AngularSvgIconModule,
        TranslateModule,
        RouterModule,
        MapModule,
    ],
    declarations: [
        ShadowCssDirective,
        AddMenuComponent,
        OfflineImageComponent,
        ExternalLinkComponent,
        GeoIconComponent,
        GeoSelectComponent,
        FormatDatePipe,
        ObservationListCardComponent,
        ObservationSkeletonComponent,
        ImgSwiperComponent,
        HeaderComponent,
        RefreshWithCancelComponent,
        SummaryComponent,
        HeaderColorDirective,
        SelectComponent,
        GeoFabComponent,
        GeoNameComponent,
    ],
    exports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonicModule,
        TranslateModule,
        RouterModule,
        ShadowCssDirective,
        AngularSvgIconModule,
        AddMenuComponent,
        OfflineImageComponent,
        ExternalLinkComponent,
        GeoIconComponent,
        GeoSelectComponent,
        FormatDatePipe,
        ObservationListCardComponent,
        ObservationSkeletonComponent,
        ImgSwiperComponent,
        HeaderComponent,
        RefreshWithCancelComponent,
        SummaryComponent,
        HeaderColorDirective,
        SelectComponent,
        GeoFabComponent,
    ]
})
export class SharedModule { }
