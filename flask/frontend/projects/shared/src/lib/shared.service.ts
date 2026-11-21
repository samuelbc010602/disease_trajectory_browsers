import {Inject, Injectable, InjectionToken} from '@angular/core';
import {SharedConfig} from "projects/shared/src/lib/shared.config";
import {Observable, of, Subject, BehaviorSubject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private _project: string = this.config.project;
  private _toolbarIsOn: boolean = this.config.toolbar_open;
  private _sideBarIsOpen: boolean = this.config.sidebar_open;
  private _searchBarIsAtTop: boolean = false;
  private _searchBarItems: String[] = [];
  private _showNetworkToggleButton: boolean = this.config.show_toggle_network_btn;
  private _networkToggleButtonOn: boolean = false;

  public minTrajectoryLength_temp: number = this.config.min_trajectory_length;
  public maxTrajectoryLength_temp: number = this.config.max_trajectory_length;
  public minRelativeRisk_temp: number = this.config.min_relativerisk;
  public maxRelativeRisk_temp: number = this.config.max_relativerisk;
  public minNumPatients_temp: number = this.config.min_number_patients;
  public maxNumPatients_temp: number = this.config.max_number_patients;
  public minChapters_temp: number = this.config.min_chapters;
  public maxChapters_temp: number = this.config.max_chapters;

  private _minTrajectoryLength: number = this.config.min_trajectory_length;
  private _maxTrajectoryLength: number = this.config.max_trajectory_length;
  private _minRelativeRisk: number = this.config.min_relativerisk;
  private _maxRelativeRisk: number = this.config.max_relativerisk;
  private _minNumPatients: number = this.config.min_number_patients;
  private _maxNumPatients: number = this.config.max_number_patients;
  private _minChapters: number = this.config.min_chapters;
  private _maxChapters: number = this.config.max_chapters;
  private _is_capped: boolean = this.config.is_capped;

  private _searchBarItemsString: string = '';
  private _filterApplied: boolean = false;
  private _nodeFontSize: any;
  private _edgeFontSize: any;
  private _nodeStyle: any = 'codetext';
  private _edgeStyle: any;
  private _currentNumTrajectories: number = 0;
  private _isLinearSearchOngoing: boolean = false;
  private _isNetworkedSearchOngoing: boolean = false;
  private _pageSize: number = 10;
  private _pageIndex: number = 0;
  private _selectedElements: any;
  private _selectedElement: any;
  private _selectedSidebarTab: any;
  private _areMultipleElementsSelected: boolean = false;
  private _isSingleElementSelected: boolean = false;
  public _cytoscapeSearchObjects: any;
  private _findNode: string = '';
  private _deselectedElement:boolean = false;
  private _exportVisualizationAs: string = '';
  private _distinctNodes: any; // Used as data for 'Find Node dropdown' in networked view
  

  // Search filters
  private _filtersGenderSelected = new BehaviorSubject<string>(this.config.gender_selected);
  public genderSelection$ = this._filtersGenderSelected.asObservable();

  // Main
  private _visualizationElements = null;

  private zoomLevelSource = new BehaviorSubject<number>(0);
  zoomLevel$ = this.zoomLevelSource.asObservable();
  
  setZoomLevel(level: number) {
    this.zoomLevelSource.next(level);
  }
  
  private edgeSelectionSubject = new Subject<'incoming' | 'outgoing' | 'inverse' | 'trajectory'>();
  edgeSelection$ = this.edgeSelectionSubject.asObservable();

  markEdgeSelection(direction: 'incoming' | 'outgoing' | 'inverse' | 'trajectory') {
    this.edgeSelectionSubject.next(direction);
  }

  // Fired when the sidebar (or one of its tabs) becomes visible, so sliders
  // rendered while hidden can re-measure their width.
  private sidebarLayoutSubject = new Subject<void>();
  sidebarLayout$ = this.sidebarLayoutSubject.asObservable();

  notifySidebarLayout() {
    this.sidebarLayoutSubject.next();
  }

  /**
   * Single place to change the selected search codes. Keeps the item list and
   * the comma-separated code string (which drives the graph query) in sync.
   * Removing every code returns to the start page.
   */
  public setSearchItems(items: any[]): void {
    this._searchBarItems = [...items];
    this._searchBarItemsString = items.map((i: any) => i._id).join(',');
    this._pageIndex = 0;
    if (items.length === 0) {
      this._searchBarIsAtTop = false;
      this._isLinearSearchOngoing = false;
      this._isNetworkedSearchOngoing = false;
      this._currentNumTrajectories = 0;
      this._distinctNodes = undefined;
      this.graphCodes = new Set<string>();
      this._selectedElements = undefined;
      this._sideBarIsOpen = false;
    } else {
      this._searchBarIsAtTop = true;
    }
  }

  public addSearchItem(item: any): void {
    const items: any[] = this._searchBarItems || [];
    if (!item || items.some((i: any) => i._id === item._id)) { return; }
    this.setSearchItems([...items, item]);
  }

  public removeSearchItem(item: any): void {
    this.setSearchItems((this._searchBarItems || []).filter((i: any) => i._id !== item._id));
  }

  // Ask the header search bar to take keyboard focus (e.g. "Start searching" on the landing page)
  private focusSearchSubject = new Subject<void>();
  focusSearch$ = this.focusSearchSubject.asObservable();
  focusSearch() {
    this.focusSearchSubject.next();
  }

  // Default (config) limits for the search filters, used by "reset" buttons
  public get filterDefaults() {
    return {
      minTrajectoryLength: this.config.min_trajectory_length,
      maxTrajectoryLength: this.config.max_trajectory_length,
      minRelativeRisk: this.config.min_relativerisk,
      maxRelativeRisk: this.config.max_relativerisk,
      minNumPatients: this.config.min_number_patients,
      maxNumPatients: this.config.max_number_patients,
      minChapters: this.config.min_chapters,
      maxChapters: this.config.max_chapters,
    };
  }

  private revertStateSubject = new Subject<void>();
  revertState$ = this.revertStateSubject.asObservable();

  revertToPreviousState() {
    this.revertStateSubject.next();
  }

  /** Codes (shared_name) of the nodes in the current graph, used to limit extra-code suggestions. */
  public graphCodes = new Set<string>();

  /** Synchronous access to the project config. */
  public get cfg(): SharedConfig {
    return this.config;
  }

  constructor(@Inject(SharedServiceToken) private config: SharedConfig) {

  }

  private subject = new Subject<any>();
  public sendMessage(type: string, data: any) {
    // This might be deleted
    this.subject.next({ type: type, data: data });
  }

  public getLinearSearchParams(){
    let rr = this.minRelativeRisk + ',' + this.maxRelativeRisk;
    let np = this.minNumPatients + ',' + this.maxNumPatients;
    let ll = this.minTrajectoryLength + ',' + this.maxTrajectoryLength;
    let cc = this.minChapters + ',' + this.maxChapters;
    let networked = this.networkToggleButtonOn;
    let gender = this.filtersGenderSelected;
    let page_size = this.pageSize
    let page = this.pageIndex;

    let comp = {
      rr:rr,
      np:np,
      ll:ll,
      cc:cc,
      networked:networked,
      gender:gender,
      page_size:page_size,
      page:page
    }
    return comp;
  }

  getConfig(): Observable<SharedConfig> {
    return of(this.config);
  }

  // ######
  // HEADER
  // ######

  public get projectName() {
    return this._project;
  }

  // Toolbar is shown/hidden
  public get toolbarIsOn() {
    return this._toolbarIsOn;
  }

  public set toolbarIsOn(value: boolean) {
    this._toolbarIsOn = value;
  }

  // Search bar is slided to the top of the page (Search is ongoing)
  public get searchBarIsAtTop() {
    return this._searchBarIsAtTop;
  }

  public set searchBarIsAtTop(value: boolean) {
    this._searchBarIsAtTop = value;
  }

  // Search bar items as comma separated string
  public get searchBarItemsString() {
    return this._searchBarItemsString;
  }
  public set searchBarItemsString(value: string) {
    this._searchBarItemsString = value;
  }

  public get searchBarItems() {
    return this._searchBarItems;
  }

  public set searchBarItems(values: any) {
    this._searchBarItems = values;
  }

  public get is_capped(){
    return this._is_capped;
  }
  public set is_capped(values: boolean){
    this._is_capped = values;
  }

  // Show the toggle button for network view
  public get showNetworkToggleButton() {
    return this._showNetworkToggleButton;
  }

  public set showNetworkToggleButton(value: boolean) {
    this._showNetworkToggleButton = value;
  }

  // Search network toggle button
  public get networkToggleButtonOn() {
    return this._networkToggleButtonOn;
  }

  public set networkToggleButtonOn(value: boolean) {
    this._networkToggleButtonOn = value;
  }

  // ####
  // MAIN
  // ####

  // Sidebar is open/closed
  public get sideBarIsOpen() {
    return this._sideBarIsOpen;
  }

  public set sideBarIsOpen(value: boolean) {
    this._sideBarIsOpen = value;
  }

  public get selectedSidebarTab():number {
    return this._selectedSidebarTab;
  }

  public set selectedSidebarTab(value: number) {
    this._selectedSidebarTab = value;
  }


  // Visualization elements - nodes and edges (for Cytoscape.js canvas)
  public get visualizationElements() {
    return this._visualizationElements;
  }

  public set visualizationElements(elements: any) {
    this._visualizationElements = elements;
  }

  public get currentNumberTrajectories(){
    return this._currentNumTrajectories;
  }

  public set currentNumberTrajectories(value: number){
    this._currentNumTrajectories = value;
  }

  public get isLinearSearchOngoing(){
    return this._isLinearSearchOngoing;
  }

  public set isLinearSearchOngoing(value: boolean){
    this._isLinearSearchOngoing = value;
  }

  public get isNetworkedSearchOngoing(){
    return this._isNetworkedSearchOngoing;
  }

  public set isNetworkedSearchOngoing(value: boolean){
    this._isNetworkedSearchOngoing = value;
  }

  public set pageSize(value: number){
    this._pageSize = value;
  }

  public get pageSize(): number{
    return this._pageSize;
  }

  public set pageIndex(value: number){
    this._pageIndex = value;
  }

  public get pageIndex(): number{
    return this._pageIndex;
  }

  public set selectedElements(value: any){
    this._selectedElements = value;
  }

  public get selectedElements(): any{
    return this._selectedElements;
  }

  public set selectedElement(value: any){
    this._selectedElement = value;
  }

  public get selectedElement(): any{
    return this._selectedElement;
  }

  public get areMultipleElementsSelected(): boolean{
    return this._areMultipleElementsSelected;
  }

  public set areMultipleElementsSelected(value: boolean){
    this._areMultipleElementsSelected = value;
  }

  public get isSingleElementSelected(): boolean{
    return this._isSingleElementSelected;
  }

  public set isSingleElementSelected(value: boolean){
    this._isSingleElementSelected = value;
  }

  // ################
  // SIDEBAR: Filters
  // ################

  // Gender selected
  public get filtersGenderSelected() {
    return this._filtersGenderSelected.value;
  }

  public set filtersGenderSelected(value: string) {
    this._filtersGenderSelected.next(value);
  }

  public get minChapters(){
    return this._minChapters;
  }
  public set minChapters(value: number){
    this._minChapters = value;
  }

  public get maxChapters(){
    return this._maxChapters;
  }
  public set maxChapters(value: number){
    this._maxChapters = value;
  }

  // Min. / Max. trajectory length
  public get minTrajectoryLength() {
    return this._minTrajectoryLength;
  }

  public set minTrajectoryLength(value: number) {
    this._minTrajectoryLength = value;
  }

  public get maxTrajectoryLength() {
    return this._maxTrajectoryLength;
  }

  public set maxTrajectoryLength(value: number) {
    this._maxTrajectoryLength = value;
  }

  // Min. / Max. relative risk
  public get minRelativeRisk() {
    return this._minRelativeRisk;
  }

  public set minRelativeRisk(value: number) {
    this._minRelativeRisk = value;
  }

  public get maxRelativeRisk() {
    return this._maxRelativeRisk;
  }

  public set maxRelativeRisk(value: number) {
    this._maxRelativeRisk = value;
  }

  // Min. / Max. number of patients
  public get minNumPatients() {
    return this._minNumPatients;
  }

  public set minNumPatients(value: number) {
    this._minNumPatients = value;
  }

  public get maxNumPatients() {
    return this._maxNumPatients;
  }

  public set maxNumPatients(value: number) {
    this._maxNumPatients = value;
  }

  public set filterApplied(value: boolean){
    // Hack to always fire the ngOnChanges() change detection
    this._filterApplied = !this._filterApplied;
  }

  public get filterApplied(){
    return this._filterApplied;
  }

  public set deselectedElement(value: boolean){
    this._deselectedElement = value;
  }

  public get deselectedElement(){
    return this._deselectedElement;
  }

  // Node and edge annotation style and font size
  public get nodeFontSize(){
    return this._nodeFontSize;
  }
  public set nodeFontSize(value: number){
    this._nodeFontSize = value;
  }

  public get edgeFontSize() {
    return this._edgeFontSize;
  }
  public set edgeFontSize(value: number) {
    this._edgeFontSize = value;
  }
  public get nodeStyle(){
    return this._nodeStyle;
  }
  public set nodeStyle(value:string){
    this._nodeStyle = value;
  }
  public get edgeStyle(){
    return this._edgeStyle;
  }
  public set edgeStyle(value: string){
    this._edgeStyle = value;
  }

  public get findNode(): string{
    return this._findNode;
  }

  public set findNode(node: string){
    this._findNode = node;
  }

 public get distinctNodes(){
    return this._distinctNodes;
  }
  public set distinctNodes(data: any){
    this._distinctNodes = data;
  }

  public set exportVisualizationAs(value: string){
    this._exportVisualizationAs = value;
    setTimeout(() => {
      this._exportVisualizationAs = '';
    }, 200)
  }

  public get exportVisualizationAs(): string{
    return this._exportVisualizationAs;
  }

}

export const SharedServiceToken = new InjectionToken<SharedConfig>('SharedConfig');
