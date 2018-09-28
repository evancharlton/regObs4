import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: './pages/tabs/tabs.module#TabsPageModule'
  },
  {
    path: 'home',
    loadChildren: './pages/home/home.module#HomePageModule'
  },
  {
    path: 'trip',
    loadChildren: './pages/trip/trip.module#TripPageModule'
  },
  {
    path: 'my-observations',
    loadChildren: './pages/my-observations/my-observations.module#MyObservationsPageModule'
  },
  {
    path: 'warning-list',
    loadChildren: './pages/warning-list/warning-list.module#WarningListPageModule'
  },
  {
    path: 'user-settings',
    loadChildren: './pages/user-settings/user-settings.module#UserSettingsPageModule'
  },
  { path: 'add', loadChildren: './pages/add/add.module#AddPageModule' },
  { path: 'trip-log', loadChildren: './pages/trip-log/trip-log.module#TripLogPageModule' },
  { path: 'start-wizard', loadChildren: './pages/start-wizard/start-wizard.module#StartWizardPageModule' },
  { path: 'view-observation/:id', loadChildren: './pages/view-observation/view-observation.module#ViewObservationPageModule' },
  { path: 'warning-detail/:id', loadChildren: './pages/warning-detail/warning-detail.module#WarningDetailPageModule' },
  { path: 'observation-list', loadChildren: './pages/observation-list/observation-list.module#ObservationListPageModule' },
  { path: 'offline-map', loadChildren: './pages/offline-map/offline-map.module#OfflineMapPageModule' },
  { path: 'login', loadChildren: './pages/login/login.module#LoginPageModule' },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
