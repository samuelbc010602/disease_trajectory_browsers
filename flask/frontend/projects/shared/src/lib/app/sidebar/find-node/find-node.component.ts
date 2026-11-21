import {AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";
import {FormControl, UntypedFormControl} from "@angular/forms";
import {map, Observable, startWith} from "rxjs";
import {DataProviderService} from "projects/shared/src/lib/data-provider.service";

@Component({
  selector: 'lib-find-node',
  templateUrl: './find-node.component.html',
  styleUrls: ['./find-node.component.css']
})
export class FindNodeComponent implements OnInit, OnChanges {

  public actionButtonsDisabled: boolean = true;
  myControl = new FormControl('');
  options: string[] = [];
  nodeOptions: Observable<any[]> | undefined;
  @Input() public codes: any;
  @Input() public networkBthToggled: any;
  @Input() public filterApplied:any; // Catch a state change from the 'Search with filter' button

  constructor(public sharedService: SharedService, public dataProvider: DataProviderService) {
  }

  ngOnInit(): void {
    this.loadFindNodeNodes();
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }

  public selectedAutocompleteElement(event: any) {
    const nodeName = event.option.value;
    // show loading bar
    this.sharedService.findNode = nodeName;
    // select all with this name in the app-cytoscape.component (it may take awhile)
    // DO SOMETHING HERE this.sharedService.sendMessage(SharedService.LOCAL_CYTOSCAPE_SEARCH, nodeName);
  }

  private _filterNodes(value: string) {
    const filterValue = value.toLowerCase();
    return this.sharedService._cytoscapeSearchObjects.filter((data: any) => data.full_name.toLowerCase().indexOf(filterValue) === 0);
  }

  public autocompleteFocus() {
    console.log('data was loaded');
    this.nodeOptions = this.myControl.valueChanges.pipe(startWith(''), map(data => data ? this._filterNodes(data) : this.sharedService._cytoscapeSearchObjects.slice()));

    //this.filteredNodes = this.myControl.valueChanges.pipe(startWith(''), map(data => data ? this._filterNodes(data) : this.sharedService._cytoscapeSearchObjects.slice()));
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.loadFindNodeNodes();
  }

  private loadFindNodeNodes() {
    // If search is ongoing (searchbar has at least 1 code),
    // get the nodes for the 'Find Node' dropdown
    if (this.codes.length >= 1) {
      // If linear search else, networked search
      if (!this.sharedService.networkToggleButtonOn) {
        // Connect to backend REST API and get the linear nodes
        let params = this.sharedService.getLinearSearchParams();
        let codes = this.sharedService.searchBarItemsString;
        this.dataProvider.findNodeAutocompleteDropdown$(params["rr"],params["np"],params["ll"],params["cc"],params["gender"],codes,params["page_size"],params["page"])
          .subscribe({
            next: value => {
              // Put the linear nodes into _cytoscapeSearchObjects (TODO: Rename variable)
              this.sharedService._cytoscapeSearchObjects = value;
              this.autocompleteFocus();
              //console.log(value);
            },
            error: err => {
              console.log(err);
            },
            complete: () => {
              console.log('completed REST request - linear');
            }
          })
      } else {
        // Get the distinct nodes to select from the 'Find Node' dropdown
        this.sharedService._cytoscapeSearchObjects = this.sharedService.distinctNodes;
        this.autocompleteFocus();
        console.log('completed distinct Nodes - networked');
      }
    }
  }
}
