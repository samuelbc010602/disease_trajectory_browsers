export interface SharedConfig {
  // Side wide config (logo and footer)
  abbreviation?: string;
  url: string,
  title?: string;
  version?: string;
  footerText?: string;
  // Menu
  show_help_btn?: boolean;
  show_about_btn?: boolean;
  show_toolbar_btn?: boolean;
  // Cookie notice
  cookie_notice_text?: string;
  cookie_page_content?: string;
  // Search bar
  show_toggle_network_btn: boolean;
  placeholder_text_gender: string;
  placeholder_text_all: string;
  no_dropdown_results_text: string;
  dropdown_searching_text: string;
  // Toolbar
  toolbar_open: boolean;
  // Loading dialog
  loading_dialog_text?: string;
  loading_dialog_wait?: string;
  // Sidebar
  sidebar_open: boolean;
  // Sidebar: Search filters
  search_filter_heading?: string;
  show_sex_dropdown?: boolean;
  show_trajectory_length_slider?: boolean;
  show_relative_risk_slider?: boolean;
  show_num_patients_slider?: boolean;
  // Sidebar: Settings
  settings_heading?: string;
  // Sidebar: Find node
  find_node_heading?: string;
  find_node_placeholder?: string;
  // Sidebar: Download supplementary data
  show_supplementary_download?: boolean;
  supplementary_heading?: string;
  supplementary_text?: string;
  supplementary_download_bth?: string;
  // Sidebar: ICD chapters
  show_icd_chapters?: boolean;
  chapters_heading?: string;
  chapters_text?: string;
  chapters_disabled?: Array<number>;
  // Sidebar: Export data
  export_data_heading?: string;
  export_as_images?: boolean;
  export_as_text?: boolean;
  view_as_table?: boolean;
  // Visualization (Cytoscape.js)
  num_linear_trajectories_text?: string;
  use_custom_visualization?: boolean;
  // Help page:
  help_page_content?: string;
  // About page:
  about_page_content?: string;
  // Filters:
  gender_selected: string;
  min_trajectory_length: number;
  max_trajectory_length: number;
  min_relativerisk: number;
  max_relativerisk: number;
  min_number_patients: number;
  max_number_patients: number;
  min_chapters: number;
  max_chapters: number;
  // Annotations:
  node_annotation: string;
  edge_annotation: string;
  node_fontsize: number;
  edge_fontsize: number;
  project: string;

  is_capped: boolean;

  // ---- Project specific content (all optional; srb defaults apply when missing) ----
  chapters?: Array<{ code: string; name: string; color: string; icon?: string; inData: boolean }>;
  chapters_title?: string;
  chapters_subtitle?: string;
  chapters_icon_dir?: string;           // e.g. 'assets/images/srb/'
  logo_img?: string;                    // header logo (80x80 recommended)
  logo_title_top?: string;
  logo_title_bottom?: string;
  code_label?: string;                  // 'Service code' | 'ATC code'
  item_noun?: string;                   // 'service' | 'drug group'
  item_noun_plural?: string;
  patient_baseline?: number;            // smallest patient count of any transition in the data
  show_sex_toggle?: boolean;            // default true
  network_requires_sex?: boolean;       // default true (srb: network view only per sex)
  search_placeholder?: string;
  landing_title?: string;
  landing_text?: string;
  about?: { subtitle: string; stats: Array<{ value: string; label: string }>; paragraphs: string[]; lead?: string; references?: string[] };
  patient_note?: string;                // shown under the patients filter when no minimum is set
  help_video_url?: string;
  walkthrough?: Array<{ img: string; title: string; text: string }>;
  demo?: {
    query: string;
    options: string[];
    chip: string;
    nodes: Array<{ id: string; x: number; y: number; color: string; label: string; filtered?: boolean; hit?: boolean }>;
    edges: Array<{ from: string; to: string; filtered?: boolean }>;
  };

}
