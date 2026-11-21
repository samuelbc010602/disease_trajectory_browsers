import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Observable, Subject, Subscription, of } from "rxjs";
import { Router } from "@angular/router";
import { SharedService } from "projects/shared/src/lib/shared.service";
import { DataProviderService } from "projects/shared/src/lib/data-provider.service";
import { SharedConfig } from "projects/shared/src/lib/shared.config";
import { FormControl } from '@angular/forms';
import { debounceTime, switchMap, map, catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import {TagInputModule} from "ngx-chips";
import {ChaptersDialogComponent} from '../menu/chapters.component';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { SRB_CHAPTERS, findChapter } from 'projects/shared/src/lib/srb-chapters';

@Component({
  selector: 'lib-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
})
export class SearchBarComponent implements OnDestroy {
  private subscriptions = new Subscription();
  @ViewChild('searchInputEl') searchInputEl?: ElementRef<HTMLInputElement>;

  constructor(
    public router: Router,
    public sharedService: SharedService,
    public dataProviderService: DataProviderService,
    private dialog: MatDialog
    
  ) {}

  public showNoResults: boolean = false;
  public dropdownLoader: boolean = false;
  public noResultForText: string = '';
  public config: Observable<SharedConfig> | undefined;
  public dropdown_search_text: any;
  public placeholder_text: any;
  public chap_map: Record<string, string> = {
  "anesthesiology": "01",
  "radiology": "03",
  "dermatology and venereology": "04",
  "rheumatology": "06",
  "gynecology and obstetrics": "08",
  "internal medicine": "07",
  "surgery": "09",
  "laboratory": "11",
  "eye and ear": "15",
  "neuro surgery and neurology": "17",
  "orthopaedic surgery": "20",
  "pathology": "22",
  "plastic surgery": "23",
  "psychiatry": "24",
  "pediatrics": "25",
  "dentistry": "50",
  "physiotherapy and rehabilitation": "51",
  "chiropractic": "53",
  "foot therapy": "54",
  "psychology": "63",
  "general practice": "80",
  "emergency medicine": "81",
  "pre-hospital service": "85",
  "translation service": "96"
};

  // NEW: bridge input for Material Autocomplete
  searchInput$ = new Subject<string>();
  searchControl = new FormControl('');

  // Holds values for Material dropdown
  autoCompleteItems$!: Observable<any[]>;


  ngOnInit(): void {
    this.config = this.sharedService.getConfig();
    this.subscriptions.add(this.sharedService.focusSearch$.subscribe(() => this.searchInputEl?.nativeElement.focus()));

    // Handle gender placeholder text
    this.subscriptions.add(this.sharedService.genderSelection$.subscribe(gender => {
      if (this.sharedService.isLinearSearchOngoing || this.sharedService.isNetworkedSearchOngoing){
        this.placeholder_text = 'Add another code to narrow down trajectories…'
      }
      else if (gender === 'all') {
        this.placeholder_text = this.sharedService.cfg.search_placeholder || 'Search a service or specialty, e.g. "X-ray"';
      } else {
        this.placeholder_text = 'Search a service or specialty ({{}})'.replace("{{}}", gender === 'male' ? 'men' : 'women');
      }
    }));

    // Autocomplete: wait for a pause in typing, and cancel superseded requests
    // (switchMap) so results never arrive out of order.
    this.subscriptions.add(this.searchInput$.pipe(
      debounceTime(200),
      switchMap(text => this.dataProviderService.searchAutocompleteDropdown$(text).pipe(
        map((items: any) => ({ text, items: (items || []) as any[] })),
        catchError(() => of({ text, items: [] as any[] }))
      ))
    ).subscribe(({ text, items }) => {
      if (text !== (this.searchText || '').trim()) { return; } // user already moved on
      // While a linear search is shown, only offer codes present in the current graph
      const inGraph = this.sharedService.graphCodes;
      this.autocompleteItems = this.sharedService.isLinearSearchOngoing && inGraph.size > 0
        ? items.filter((i: any) => inGraph.has(String(i._id)))
        : items;
      this.noResultForText = text;
      this.showNoResults = this.autocompleteItems.length === 0;
      this.dropdownLoader = false;
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }


  /**
   * Wrap your existing backend query logic, but return Observable<any[]>.
   */
  public searchBarAutoCompleteItems$ = (text: string): Observable<any> => {
    // Show message "Searching..." when doing a search
    this.dropdownLoader = true;
    // Dropdown observable (to get the data from the backend server)
    let result = this.dataProviderService.searchAutocompleteDropdown$(text);
    this.noResultForText = text;
    result.subscribe( values => {
      // If no results were found, show "No result..." message
      let num_dropdown_results: number = Object.keys(values).length;
      if(num_dropdown_results === 0){
        // Show no results message
        this.showNoResults = true;
        // Hide 'Searching...' message
        this.dropdownLoader = false;
      }else{
        this.showNoResults = false;
        this.dropdownLoader = false;
      }}
    );
    return result;
  };

  matchesDistinctNodes([chapter,diagnose_text] : [string,string]): boolean {
    //console.log("this is the value in matchesDistinctNodes",chapter,diagnose_text);
    if (!diagnose_text) return false;

    // Split on " : " and take the second part
    const parts = diagnose_text.split(" : ");
    diagnose_text = parts.length > 1 ? parts[1].trim() : diagnose_text;
    //console.log("these are distinctnodes",this.sharedService.distinctNodes);
    //console.log("these are the parts and map",parts,this.chap_map[parts[0].toLowerCase()]);
    for (const node of (this.sharedService.distinctNodes || [])) {
      if (node && node[1].includes(diagnose_text) && this.chap_map[parts[0].toLowerCase()] == node[0]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Called when selecting from Material dropdown.
   */
  addTag(item: any): void {
    this.sharedService.addSearchItem(item);
    this.searchControl.setValue('');
  }


  public onNetworkViewSlideToggle(toggleObject: any): void {
    // No logic needed (same as before)
  }


  /**
   * Triggered by <tag-input> add/remove.
   */
  onItemChanges(event: any) {
    const searchCodeArray = new Array();

    for (const searchBarItem of this.sharedService.searchBarItems) {
      searchCodeArray.push(searchBarItem._id);
      console.log(searchBarItem._id);
    }

    this.sharedService.searchBarItemsString = searchCodeArray.join(',');
    this.sharedService.searchBarIsAtTop = true;
  }

searchText = '';
autocompleteItems: any[] = [];

onSearchTextChange(value: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < 2) {
    this.autocompleteItems = [];
    this.showNoResults = false;
    this.dropdownLoader = false;
    return;
  }
  this.dropdownLoader = true;
  this.showNoResults = false;
  this.searchInput$.next(text);
}
onOptionSelected(event: MatAutocompleteSelectedEvent) {
  this.sharedService.addSearchItem(event.option.value);
  // reset input, ready for the next (restricting) code
  this.searchText = '';
  this.autocompleteItems = [];
  this.showNoResults = false;
}

/** Remove one code; the graph reloads with the remaining codes (or returns to the start page). */
removeCode(item: any, event?: Event): void {
  if (event) { event.stopPropagation(); }
  this.sharedService.removeSearchItem(item);
}

/** Backspace in an empty input removes the last code, like a tag field. */
onInputKeydown(event: KeyboardEvent): void {
  const items: any[] = this.sharedService.searchBarItems || [];
  if (event.key === 'Backspace' && !this.searchText && items.length) {
    this.removeCode(items[items.length - 1]);
  }
}

clearAll(): void {
  this.sharedService.setSearchItems([]);
  this.searchText = '';
  this.autocompleteItems = [];
}

get selectedCodes(): any[] {
  return (this.sharedService.searchBarItems as any[]) || [];
}

get inputPlaceholder(): string {
  return this.selectedCodes.length ? 'Add a code to narrow down…' : this.placeholder_text;
}

codeLabel(item: any): string {
  const fn: string = item?.fn || '';
  const parts = fn.split(' : ');
  return parts.length > 1 ? parts[1] : fn;
}

codeChapter(item: any): string {
  return (item?.fn || '').split(' : ')[0] || '';
}

codeColor(item: any): string {
  return findChapter(this.sharedService.cfg.chapters || SRB_CHAPTERS, item?._id)?.color || '#8c9483';
}
displayFn = (item: any): string => {
  return item ? item.fn : '';
};



onFocus() {
  // optional: logic when focused
}

onBlur() {
  // optional: close or reset state
}




















}