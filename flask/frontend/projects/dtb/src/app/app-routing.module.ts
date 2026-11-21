import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VisualizationComponent } from "projects/shared/src/lib/app/main/visualization/visualization.component";
import { AboutPageComponent } from "projects/shared/src/lib/app/main/pages/about-page/about-page.component";
import { HelpPageComponent } from "projects/shared/src/lib/app/main/pages/help-page/help-page.component";

const routes: Routes = [
  { path: '', component: VisualizationComponent },
  { path: 'about', component: AboutPageComponent},
  { path: 'help', component: HelpPageComponent},
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
