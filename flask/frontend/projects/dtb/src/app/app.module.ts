import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { DTBComponent } from './app.component';
import { SharedModule } from "projects/shared/src/lib/shared.module";
import { SharedConfig } from "projects/shared/src/lib/shared.config";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTabsModule } from "@angular/material/tabs";
import {TagInputModule} from "ngx-chips";
import {BrowserAnimationsModule, NoopAnimationsModule} from "@angular/platform-browser/animations";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatIconModule} from "@angular/material/icon";
import {MatSidenavModule} from "@angular/material/sidenav";
import {NgxSliderModule} from "@angular-slider/ngx-slider";
import {MatSelectModule} from "@angular/material/select";
import {MatCardModule} from "@angular/material/card";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatMenuModule} from "@angular/material/menu";
import {MatButtonModule} from "@angular/material/button";
import {NgcCookieConsentConfig, NgcCookieConsentModule} from "ngx-cookieconsent";
import {MatTooltipModule} from "@angular/material/tooltip";
import {DataProviderConfig} from "projects/shared/src/lib/data-provider.config";
import {HttpClientModule} from "@angular/common/http";
import {SharedService} from "projects/shared/src/lib/shared.service";
import {MatFormFieldControl, MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";

const dataProviderConfigFile: DataProviderConfig = {
  // REST API
  base_url: "https://127.0.0.1:5000/",
  supplementary_download_url: '../../../../../../../projects/dtb/src/assets/download/RR_below_1.json',
  dropdown_search_url: 'search',
  element_meta_data_url: 'lookup',
  linear_visualization_data_url: 'linear',
  network_visualization_data_url: 'network',
  find_node_dropdown_url: 'finddropdown',
  find_node_visualization_data_url: 'findnode'
}
const configFile: SharedConfig = {
  abbreviation: 'dtb',
  project: 'dtb',
  url: 'dtb.cpr.ku.dk',
  title: 'Disease Trajectory Browser',
  version: 'v3',
  footerText: 'Copyright &copy; 2023 Brunak Group, Novo Nordisk Foundation Center for Protein Research (CPR), University of Copenhagen.<br/>Funding: EU Horizon 2020 (Grant agreement 634143) &amp; Novo Nordisk Foundation (Grant agreement NNF14CC0001).',

  // Menu
  show_help_btn: true,
  show_about_btn: true,
  show_toolbar_btn: true,

  // Cookie notice
  cookie_notice_text: 'This website uses cookies to ensure you get the best experience on our website.',
  cookie_page_content: '<h1>Cookies</h1>We use Google Analytics to make the site better...',

  // Search bar
  show_toggle_network_btn: true,
  placeholder_text: 'Search for ICD-10 code. E.g. type `G30´ or `Alzheimers disease´',
  no_dropdown_results_text: 'No disease pairs found for ',
  dropdown_searching_text: 'Loading...',

  // Toolbar
  toolbar_open: true,

  // Loading dialog
  loading_dialog_text: 'Loading data',

  // Sidebar
  sidebar_open: true,

  // Sidebar: Search filters
  search_filter_heading: 'Search',
  show_sex_dropdown: false,
  show_trajectory_length_slider: true,
  show_relative_risk_slider: true,
  show_num_patients_slider: true,

  // Sidebar: Settings
  settings_heading: 'Settings',

  // Sidebar: Find node
  find_node_heading: 'Find node',
  find_node_placeholder: 'Find node',

  // Sidebar: Download supplementary data
  show_supplementary_download: true,
  supplementary_heading: 'Supplementary data',
  supplementary_text: 'Download the dataset for diagnosis pairs with a relative risk < 1.00.',
  supplementary_download_bth: 'Download file',

  // Sidebar: ICD chapters
  show_icd_chapters: true,
  chapters_heading: 'ICD-10 chapters',
  chapters_text: 'Click on a chapter to go to the WHO ICD-10 page (opens new window).<br/><br/>Note: Grayed out chapters are not included in this web application.',
  chapters_disabled: [16,18,19,20,21],


  // Sidebar: Export data
  export_data_heading: 'Visualization',
  export_as_images: true,
  export_as_text: true,
  view_as_table: false,

  // Visualization (Cytoscape.js)
  num_linear_trajectories_text: 'Found {{}} linear trajectories in total.',
  use_custom_visualization: true,

  // Help page:
  help_page_content: '<h1>Help</h1>Text with help and maybe vides here...',

  // About page:
  about_page_content: '<h1>About</h1>Text about the page, article/research, funding, release history etc.',

  // Filters: Gender selected
  gender_selected: 'all', // u = undefined/all, m = male, f = female
  // Filters: Trajectory length
  min_trajectory_length: 2,
  max_trajectory_length: 8,
  // Filters: Relative Risk
  min_relativerisk: 1.0,
  max_relativerisk: 150.0,
  // Filters: Number of patients
  min_number_patients: 20,
  max_number_patients: 2000000,

  // Node/edge annotations:
  node_annotation: 'none',
  edge_annotation: 'none',
  node_fontsize: 12,
  edge_fontsize: 14,


}

const cookieConfig:NgcCookieConsentConfig = {
  "cookie": {
  "domain": configFile.url,
},
  "position": "bottom",
  "theme": "classic",
  "palette": {
  "popup": {
    "background": "#eeeeee",
      "text": "#000000",
      "link": "#3c74ff"
  },
  "button": {
    "background": "#FFCD01",
      "text": "#000",
      "border": "transparent"
  }
},
  "type": "opt-in",
  "content": {
  "message": configFile.cookie_notice_text,
    "dismiss": "",
    "deny": "Decline",
    "link": "Learn more...",
    "href": "cookies/",
    "policy": "Cookie Policy"
}
}

@NgModule({
  declarations: [
    DTBComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgcCookieConsentModule.forRoot(cookieConfig),
    SharedModule.forRoot(configFile, dataProviderConfigFile),
    MatToolbarModule,
    MatPaginatorModule,
    MatTabsModule,
    TagInputModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSidenavModule,
    NgxSliderModule,
    MatSelectModule,
    MatCardModule,
    MatAutocompleteModule,
    MatMenuModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NoopAnimationsModule,
    MatTooltipModule,
    HttpClientModule
  ],
  providers: [ SharedService ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [
  ],
  bootstrap: [DTBComponent]
})
export class DTBModule { }
