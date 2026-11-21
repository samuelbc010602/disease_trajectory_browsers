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
  supplementary_download_url_women: '',
  supplementary_download_url_men: '',
  dropdown_search_url: 'search',
  element_meta_data_url: 'lookup',
  linear_visualization_data_url: 'linear',
  network_visualization_data_url: 'network',
  find_node_dropdown_url: 'finddropdown',
  find_node_visualization_data_url: 'findnode'
}
const configFile: SharedConfig = {
  abbreviation: 'ptb',
  project: 'ptb',
  url: 'ptb.sund.ku.dk',
  title: 'Prescription Trajectory Browser',
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
  show_supplementary_download: false,
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
  min_trajectory_length: 2,
  max_trajectory_length: 7,
  // Filters: Relative Risk
  min_relativerisk: 1,
  max_relativerisk: 74,
  // Filters: Number of patients (per sex when Men/Women is selected, so no fixed baseline)
  min_number_patients: 0,
  max_number_patients: 2900000,
  min_chapters: 1,
  max_chapters: 7,

  // Node/edge annotations:
  node_annotation: 'none',
  edge_annotation: 'none',
  node_fontsize: 12,
  edge_fontsize: 14,

  // ---- Prescription Trajectory Browser content ----
  logo_img: 'assets/images/logo_big_ptb.png',
  logo_title_top: 'Prescription',
  logo_title_bottom: 'Trajectory Browser',
  item_noun: 'drug group',
  code_label: 'ATC code',
  patient_baseline: 0,
  patient_note: 'Every transition has at least 2,500 patients in total (men and women combined); counts for men or women alone can be lower.',
  show_sex_toggle: true,
  network_requires_sex: false,   // edges are shared by both sexes; Men/Women selects the patient count
  search_placeholder: 'Search a drug group or ATC code, e.g. "N02BE"',
  landing_title: 'Explore prescription trajectories',
  landing_text: 'See which prescriptions tend to follow each other across the Danish population. To get started, watch the short guide or search for a drug group or ATC code in the search bar above.',
  chapters_title: 'ATC main groups',
  chapters_subtitle: 'Anatomical main groups of the ATC classification in the browser, and the colour used for their drug groups in the graph.',
  // Colours = data.color of the nodes in the ptb database (one colour per ATC main group)
  chapters: [
    { code: 'A', name: 'Alimentary tract and metabolism', color: '#98191c', inData: true },
    { code: 'B', name: 'Blood and blood forming organs', color: '#dd2b29', inData: true },
    { code: 'C', name: 'Cardiovascular system', color: '#ed6725', inData: true },
    { code: 'D', name: 'Dermatologicals', color: '#a7693b', inData: true },
    { code: 'G', name: 'Genito urinary system and sex hormones', color: '#eba22f', inData: true },
    { code: 'H', name: 'Systemic hormonal preparations, excl. sex hormones and insulins', color: '#bfc12f', inData: true },
    { code: 'J', name: 'Antiinfectives for systemic use', color: '#3a3e5c', inData: true },
    { code: 'L', name: 'Antineoplastic and immunomodulating agents', color: '#83c9c5', inData: true },
    { code: 'M', name: 'Musculo-skeletal system', color: '#844c9f', inData: true },
    { code: 'N', name: 'Nervous system', color: '#db446d', inData: true },
    { code: 'P', name: 'Antiparasitic products, insecticides and repellents', color: '#587240', inData: true },
    { code: 'R', name: 'Respiratory system', color: '#624e6e', inData: true },
    { code: 'S', name: 'Sensory organs', color: '#3b353c', inData: true },
    { code: 'V', name: 'Various', color: '#9d5323', inData: true },
  ],
  about: {
    subtitle: 'The Danish Prescription Trajectory Browser',
    stats: [
      { value: '1.4 billion', label: 'prescription events' },
      { value: '~8 million', label: 'individuals' },
      { value: '30 years', label: 'of registry data' },
      { value: 'ATC level 5', label: 'drug groups' },
    ],
    paragraphs: [
      'The Danish Prescription Trajectory Browser (PTB) is a tool for exploring 30 years of data from the Danish National Prescription Registry, a nationwide administrative dataset recording all prescription medications dispensed at Danish community pharmacies. The dataset comprises 1.4 billion prescription events across almost 8 million individuals.',
      'We constructed population-scale prescription trajectories by identifying prescriptions (Anatomical Therapeutic Chemical, ATC, level-5 codes, e.g., N02AB) that co-occur more frequently than expected based on their individual frequencies. Prescription pairs with a significant directionality, where one prescription is given significantly more before the other, are then used to build trajectories, which can be pieced together into longer sequences.',
    ],
    lead: 'Here, you can explore significant prescription patterns by entering an ATC level-5 code of interest. A number of linear trajectories containing your chosen ATC code will appear, and these can be merged into a prescription trajectory network that can be exported.',
    references: [
      '[1] Jensen AB, Moseley PL, Oprea TI, et al. Temporal disease trajectories condensed from population-wide registry data covering 6.2 million patients. Nat Commun. 24, 5, 4022 (2014).',
      '[2] Siggaard T, Reguant R, Jørgensen IF, et al. Disease trajectory browser for exploring temporal, population-wide disease progression patterns in 7.2 million Danish patients. Nat Commun 11, 4952 (2020).',
      '[3] Aguayo-Orozco A, Haue AD, Jørgensen IF, et al. Optimizing drug selection from a prescription trajectory of one patient. npj Digit. Med. 4, 150 (2021).',
      '[4] Jørgensen IF, Cadell SB, Siggaard T, et al. In prep.',
    ],
  },
  help_video_url: '',
  walkthrough: [
    { img: 'assets/images/walkthrough/01-landing.png', title: 'Start here',
      text: 'Choose Both, Men or Women, then search in the bar at the top — or open the short guide.' },
    { img: 'assets/images/walkthrough/02-dropdown.png', title: 'Search for a drug group',
      text: 'Type part of a drug group name or an ATC code. Suggestions show the ATC main group above each drug group.' },
    { img: 'assets/images/walkthrough/03-graph.png', title: 'Trajectories are drawn',
      text: 'All trajectories containing the drug group are shown, centred, ten per page. Edge thickness and shade show the number of patients.' },
    { img: 'assets/images/walkthrough/04-addcode.png', title: 'Add another code',
      text: 'Keep typing in the search bar to restrict the trajectories further.' },
    { img: 'assets/images/walkthrough/05-chips.png', title: 'Every code is a chip',
      text: 'Only trajectories containing all selected codes remain. Click × on a chip to remove it again.' },
    { img: 'assets/images/walkthrough/06-details.png', title: 'Inspect a drug group',
      text: 'Click a node or an edge to see its ATC group, its trajectory, neighbouring drug groups, patients (also for men and women) and relative risk.' },
    { img: 'assets/images/walkthrough/07-filters.png', title: 'Filter',
      text: 'Open the side panel to set trajectory length, relative risk, ATC groups and patients. With Men or Women selected, the patient filter uses that sex only.' },
    { img: 'assets/images/walkthrough/08-chapters.png', title: 'ATC groups & colours',
      text: 'The Chapters page lists every ATC main group and the colour used for it in the graph.' },
  ],
  demo: {
    query: 'HMG',
    chip: 'HMG CoA reductase inhibitors (C10AA)',
    options: [
      'CARDIOVASCULAR SYSTEM : HMG CoA reductase inhibitors (C10AA)',
      'CARDIOVASCULAR SYSTEM : HMG CoA reductase inhibitors in combination with other lipid modifying agents (C10BA)',
      'CARDIOVASCULAR SYSTEM : Other lipid modifying agents (C10AX)',
    ],
    nodes: [
      { id: 'a', x: 34,  y: 92,  color: '#ed6725', label: 'ACE inhibitors' },
      { id: 'b', x: 150, y: 40,  color: '#ed6725', label: 'Beta blockers' },
      { id: 'c', x: 150, y: 146, color: '#dd2b29', label: 'Platelet inhib.' },
      { id: 'd', x: 268, y: 92,  color: '#ed6725', label: 'Statins (C10AA)', hit: true },
      { id: 'e', x: 386, y: 46,  color: '#98191c', label: 'Proton pump inhib.' },
      { id: 'f', x: 386, y: 144, color: '#db446d', label: 'Anilides', filtered: true },
    ],
    edges: [
      { from: 'a', to: 'b' }, { from: 'b', to: 'd' }, { from: 'd', to: 'e' },
      { from: 'a', to: 'c' }, { from: 'c', to: 'd' },
      { from: 'd', to: 'f', filtered: true },
    ],
  },


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
