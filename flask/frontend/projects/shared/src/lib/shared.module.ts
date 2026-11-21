import { CUSTOM_ELEMENTS_SCHEMA, ModuleWithProviders, NgModule } from '@angular/core';
import { SharedComponent } from './shared.component';
import { SharedService, SharedServiceToken } from "projects/shared/src/lib/shared.service";
import { CommonModule } from "@angular/common";
import { BrowserAnimationsModule, NoopAnimationsModule } from "@angular/platform-browser/animations";
import { CytoscapeComponent } from "projects/shared/src/lib/app/main/visualization/cytoscape.component";
import { FooterTextComponent } from "projects/shared/src/lib/app/footer/footer-text/footer-text.component";
import { LogoComponent } from "projects/shared/src/lib/app/header/logo/logo.component";
import { MenuComponent } from "projects/shared/src/lib/app/header/menu/menu.component";
import { SearchBarComponent } from "projects/shared/src/lib/app/header/search-bar/search-bar.component";
import { MessageBarComponent } from "projects/shared/src/lib/app/main/message-bar/message-bar.component";
import { ToolbarComponent } from "projects/shared/src/lib/app/main/toolbar/toolbar.component";
import { VisualizationComponent } from "projects/shared/src/lib/app/main/visualization/visualization.component";
import { ExportDataComponent } from "projects/shared/src/lib/app/sidebar/export-data/export-data.component";
import { FindNodeComponent } from "projects/shared/src/lib/app/sidebar/find-node/find-node.component";
import { IcdChaptersComponent } from "projects/shared/src/lib/app/sidebar/icd-chapters/icd-chapters.component";
import { SrbChaptersComponent } from "projects/shared/src/lib/app/sidebar/srb-chapters/srb-chapters.component";
import { NodeEdgeMetaComponent, ReplacePipe } from "projects/shared/src/lib/app/sidebar/node-edge-meta/node-edge-meta.component";
import { SearchFiltersComponent} from "projects/shared/src/lib/app/sidebar/search-filters/search-filters.component";
import { SuppDataDownloadComponent } from "projects/shared/src/lib/app/sidebar/supp-data-download/supp-data-download.component";
import { VisualizationSettingsComponent } from "projects/shared/src/lib/app/sidebar/visualization-settings/visualization-settings.component";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { TagInputModule } from "ngx-chips";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { NgxSliderModule } from "@angular-slider/ngx-slider";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatMenuModule } from "@angular/material/menu";
import { MatTabsModule } from "@angular/material/tabs";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatPaginatorModule } from "@angular/material/paginator";
import { DataProviderService, DataProviderServiceToken } from "projects/shared/src/lib/data-provider.service";
import { AnnotationService } from "projects/shared/src/lib/annotation.service";
import { HelpPageComponent } from './app/main/pages/help-page/help-page.component';
import { AboutPageComponent } from './app/main/pages/about-page/about-page.component';
import {ProgressbarComponent} from "projects/shared/src/lib/app/main/visualization/progressbar.component";
import { RangeFilterComponent } from "projects/shared/src/lib/app/sidebar/range-filter/range-filter.component";
import { SearchDemoComponent } from "projects/shared/src/lib/app/main/search-demo/search-demo.component";
import { CappedTrajectoriesDialog } from "projects/shared/src/lib/app/main/visualization/capped-trajectories-dialog.component";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatDialog} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';



@NgModule({
  declarations: [
    SharedComponent,
    CytoscapeComponent,
    FooterTextComponent,
    LogoComponent,
    MenuComponent,
    SearchBarComponent,
    MessageBarComponent,
    ToolbarComponent,
    VisualizationComponent,
    ExportDataComponent,
    FindNodeComponent,
    IcdChaptersComponent,
    SrbChaptersComponent,
    NodeEdgeMetaComponent,
    SearchFiltersComponent,
    SuppDataDownloadComponent,
    VisualizationSettingsComponent,
    ReplacePipe,
    HelpPageComponent,
    AboutPageComponent,
    ProgressbarComponent,
    RangeFilterComponent,
    SearchDemoComponent,
  ],
  imports: [
  CommonModule,
  NoopAnimationsModule,
  BrowserAnimationsModule,
  FormsModule,
  ReactiveFormsModule,
  MatFormFieldModule,
  MatInputModule,
  MatAutocompleteModule,
  MatChipsModule,
  MatButtonToggleModule,
  MatSlideToggleModule,
  MatCardModule,
  MatSelectModule,
  MatIconModule,
  MatMenuModule,
  MatTabsModule,
  MatSidenavModule,
  MatPaginatorModule,
  MatButtonModule,
  MatProgressBarModule,
  MatDialogModule,
  TagInputModule,
  NgxSliderModule,
  MatTooltipModule,
  CappedTrajectoriesDialog,
  MatFormFieldModule,
  MatInputModule,
  MatAutocompleteModule,
  MatIconModule,
  FormsModule
],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  exports: [
    SharedComponent,
    CytoscapeComponent,
    FooterTextComponent,
    LogoComponent,
    MenuComponent,
    SearchBarComponent,
    MessageBarComponent,
    ToolbarComponent,
    VisualizationComponent,
    ExportDataComponent,
    FindNodeComponent,
    IcdChaptersComponent,
    SrbChaptersComponent,
    NodeEdgeMetaComponent,
    SearchFiltersComponent,
    SuppDataDownloadComponent,
    VisualizationSettingsComponent,
    HelpPageComponent,
    AboutPageComponent,
    ReplacePipe,
    HelpPageComponent,
    AboutPageComponent
  ]
})
export class SharedModule {
  static forRoot(config: any, dataProviderConfig:any): ModuleWithProviders<any> {
    return {
      ngModule: SharedModule,
      providers: [
        SharedService,
        {
          provide: SharedServiceToken,
          useValue: config
        },
        DataProviderService,
        {
          provide: DataProviderServiceToken,
          useValue: dataProviderConfig
        },
        AnnotationService
      ]
    };
  }
}
