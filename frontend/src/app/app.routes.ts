import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HotelDetailComponent } from './pages/hotel-detail/hotel-detail.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'hotels/new', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'hotels/:slug', component: HotelDetailComponent }
];
