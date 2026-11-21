import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { CDBComponent } from './app.component';
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

const configFile: SharedConfig = {
  // Site wide configurations
  abbreviation: 'cdb',
  url: 'death.cpr.ku.dk',
  title: 'Cause of Death Browser',
  version: 'v1',
  footerText: 'Copyright © 2022 Brunak Group, Novo Nordisk Foundation Center for Protein Research (CPR), University of Copenhagen.<br/>Funding: Novo Nordisk Foundation (Grant agreement NNF14CC0001).',

  // Menu
  show_help_btn: true,
  show_about_btn: true,
  show_toolbar_btn: true,

  // Cookie notice
  cookie_notice_text: 'This website uses cookies to ensure you get the best experience on our website.',
  cookie_page_content: '<h1>Cookies</h1>We use Google Analytics to make the site better...',

  // Search bar
  show_toggle_network_btn: false,
  placeholder_text: 'Search for ICD-10 code. E.g. type \'G30\'',
  no_dropdown_results_text: 'No disease pairs with this search: ',
  dropdown_searching_text: 'Searching...',

  // Toolbar
  toolbar_open: false,

  // Loading dialog
  loading_dialog_text: 'Loading data...',

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
  show_supplementary_download: false,
  supplementary_heading: 'Download data',
  supplementary_text: 'Download the supplementary dataset for diagnosis pairs with relative risk below 1, which are not included in the browser.',
  supplementary_download_bth: 'Download JSON file',
  supplementary_download_url: 'assets/download/RR_below_1.json',

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
  help_page_content: '<h1>Help</h1>Text with help and maybe videos here...',

  // About page:
  about_page_content: '<h1>About</h1>Text about the page, article/research, funding, release history etc.',

  // Filters: Gender selected
  gender_selected: 'all', // u = undefined/all, m = male, f = female

}
const dataProviderConfigFile: DataProviderConfig = {
  // REST API
  base_url: "http://localhost:5000/",
  supp_data_download_url: 'assets/download/', // No file provided yet
  dropdown_search_url: 'search',
  element_meta_data_url: 'lookup',
  linear_visualization_data_url: 'linear',
  network_visualization_data_url: 'network',
  find_node_dropdown_url: 'findnode',
  find_node_visualization_data_url: 'finddropdown'

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
    CDBComponent
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
    NoopAnimationsModule,
    MatTooltipModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [
  ],
  bootstrap: [CDBComponent]
})
export class CDBModule { }
