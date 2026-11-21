import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { SRBComponent } from './app.component';
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';

const dataProviderConfigFile: DataProviderConfig = {
  // REST API
  base_url: "/",
  supplementary_download_url_women: '../../../../../../../projects/srb/src/assets/download/pairs_data_women.tsv',
  supplementary_download_url_men: '../../../../../../../projects/srb/src/assets/download/pairs_data_men.tsv',
  dropdown_search_url: 'search',
  element_meta_data_url: 'lookup',
  linear_visualization_data_url: 'linear',
  network_visualization_data_url: 'network',
  find_node_dropdown_url: 'finddropdown',
  find_node_visualization_data_url: 'findnode'
}
const configFile: SharedConfig = {
  abbreviation: 'srb',
  project: 'srb',
  url: 'primcare.sund.ku.dk',
  title: 'Service Registry Browser',
  version: 'v3',
  footerText: 'Copyright &copy; 2025 Brunak Group, Novo Nordisk Foundation Center for Protein Research (CPR), University of Copenhagen.',

  is_capped: false,
  // Menu
  show_help_btn: true,
  show_about_btn: true,
  show_toolbar_btn: true,

  // Cookie notice
  cookie_notice_text: 'This website uses cookies to ensure you get the best experience on our website.',
  cookie_page_content: '<h1>Cookies</h1>We use Google Analytics to make the site better...',

  // Search bar
  show_toggle_network_btn: true,
  placeholder_text_gender: 'Search for service code or description for {{}} trajectories',
  placeholder_text_all: 'Search for service code or description across all trajectories',
  no_dropdown_results_text: 'No disease pairs found for ',
  dropdown_searching_text: 'Loading...',

  // Toolbar
  toolbar_open: true,

  // Loading dialog
  loading_dialog_text: 'Loading data...',
  loading_dialog_wait: 'Loading data, this may take a while for some filters...',

  // Sidebar
  sidebar_open: false,

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
  supplementary_text: 'Download the datasets with significant disease pairs for men and women respectively',
  supplementary_download_bth: 'Download file',

  // Sidebar: ICD chapters
  // show_icd_chapters: true,
  // chapters_heading: 'ICD-10 chapters',
  // chapters_text: 'Click on a chapter to go to the WHO ICD-10 page (opens new window).<br/><br/>Note: Grayed out chapters are not included in this web application.',
  // chapters_disabled: [16,18,19,20,21],


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
  min_trajectory_length: 1,
  max_trajectory_length: 12,
  // Filters: Relative Risk
  min_relativerisk: 1,
  max_relativerisk: 62,
  // Filters: Number of patients (every transition in the data has >= 50,000 patients)
  min_number_patients: 50000,
  max_number_patients: 4000000,
  min_chapters: 1,
  max_chapters: 25,

  // Node/edge annotations:
  node_annotation: 'none',
  edge_annotation: 'none',
  node_fontsize: 12,
  edge_fontsize: 14,


}

const cookieConfig:NgcCookieConsentConfig = {
  "cookie": {
    // Host-only cookie (no Domain attribute) so the choice is remembered on
    // whatever host serves the app (production, localhost, 127.0.0.1, ...).
    // A fixed domain made the browser reject the cookie everywhere else.
    "domain": "",
    "path": "/",
    "expiryDays": 365,
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
    SRBComponent
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
    HttpClientModule,
    MatButtonToggleModule,
  ],
  providers: [ SharedService ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [
  ],
  bootstrap: [SRBComponent]
})
export class SRBModule { }
