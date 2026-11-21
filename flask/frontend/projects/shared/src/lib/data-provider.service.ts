import {Inject, Injectable, InjectionToken} from '@angular/core';
import {Observable, of} from "rxjs";
import {DataProviderConfig} from "projects/shared/src/lib/data-provider.config";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {SharedService} from "projects/shared/src/lib/shared.service";

@Injectable({
  providedIn: 'root'
})
export class DataProviderService {
  constructor(@Inject(DataProviderServiceToken) private config: DataProviderConfig, private http:HttpClient, private sharedService: SharedService) { }

  getConfig(): Observable<DataProviderConfig> {
    return of(this.config);
  }
  // Supplementary data for download (typically a file)
  public supplementaryDataDownload$ = (): Observable<Object> => {
    return this.http.get(this.config.base_url + this.config.supplementary_download_url_men)
  };
  // Dropdown nodes, while typing (auto-complete) to find the right diagnoses code
  //Uses /search
  public searchAutocompleteDropdown$ = (text: string): Observable<Object> => {
    let gender = this.sharedService.filtersGenderSelected;
    let url_string = `?g=${encodeURIComponent(gender)}&q=${encodeURIComponent(text)}`;
    return this.http.get(this.config.base_url + this.config.dropdown_search_url + url_string);
  }
  // Extra information (in sidebar) about a node or an edge, when clicking on an element in the visualization
  public getElementMetaData$ = (type: string, gender: string, id: string, shared_name: string, network: boolean): Observable<any> => {
    console.log("getting type",type,"gender",gender,"id",id,"shared_name",shared_name);
    id = id.split('@')[0]; // Take only the part before the '@' sign
    shared_name = shared_name.replace(/ /g,'');
    let url_string = `?t=${type}&g=${gender}&id=${id}&shared_name=${shared_name}&network=${network.toString()}`;
    console.log("Getting meta data from: ",this.config.base_url + this.config.element_meta_data_url + url_string);
    return this.http.get(this.config.base_url + this.config.element_meta_data_url + url_string);
  }
  // The main search data, for visualizing linear or networked graph of trajectories (vislualizing data)
  public visualizationData$ = (isNetworked: boolean, method: string, relativeRisk: string,
                           patientCount: string, linearLength: string, chapters: string, gender: string,
                           icd10codes: string, pageSize: number, page: number): Observable<any> => {
    let url_string = ''; // TODO: Simplify this with separate observable methods for Network and Linear data calls
    if (isNetworked === undefined || !isNetworked) {
      isNetworked = false;
      url_string = this.config.linear_visualization_data_url;
    }else {
      isNetworked = true;
      url_string = this.config.network_visualization_data_url;
    }
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    if (this.sharedService.searchBarItems.length >= 1) {
      let middle = icd10codes.split(",");

      icd10codes = middle
        .filter((code: any) =>
          this.sharedService.searchBarItems.some((item : any) => item._id === code)
        )
        .join(",");
    }
    const httpBody = {
      'g': gender,
      'c': icd10codes,
      'l': linearLength,
      'r': relativeRisk,
      'p': patientCount,
      'ch': chapters,
      'pn': page,
      'ps': pageSize,
      'filter':this.sharedService.filterApplied.toString()
    };
    if (isNetworked == false){
      this.sharedService.isNetworkedSearchOngoing = true;
    }else{
      this.sharedService.isLinearSearchOngoing = true;
    }
    
    this.sharedService.filtersGenderSelected = gender;

    console.log("visualizationData", this.config.base_url + url_string," and posting ", httpBody);
    return this.http.post(this.config.base_url + url_string, httpBody, httpOptions);
    
  }
  // For searching within a search (linear) result,
  // ex. searching for two codes and giving back the intersection (both inclusive)
  public findNodeVisualizationData$ = (isNetworked: boolean, method: string, relativeRisk: string,
                          patientCount: string, linearLength: string, gender: string,
                          icd10codes: string, pageSize: number, page: number, findnode: string): Observable<any> => {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    const httpBody = {
      'g': gender,
      'c': icd10codes,
      'l': linearLength,
      'r': relativeRisk,
      'p': patientCount,
      'pn': page,
      'ps': pageSize,
      'f': findnode
    };
    console.log("findNodeVisualizationData", this.config.base_url + this.config.find_node_visualization_data_url," and posting ", httpBody)
    return this.http.post(this.config.base_url + this.config.find_node_visualization_data_url, httpBody, httpOptions);
  }
  // Find all nodes within the search and show dropdown with theses (in 'Find node')
  public findNodeAutocompleteDropdown$ = (relativeRisk: string,
                                  patientCount: string, linearLength: string, chapters: string, gender: string,
                                  icd10codes: string, pageSize: number, page: number): Observable<any> => {
    console.log(relativeRisk)
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      })
    };
    const httpBody = {
      'g': gender,
      'c': icd10codes,
      'l': linearLength,
      'r': relativeRisk,
      'p': patientCount,
      'pn': page,
      'ch':chapters,
      'ps': pageSize
    };
    console.log("findNodeAutocompleteDropdown", this.config.base_url + this.config.find_node_dropdown_url," and posting ", httpBody)
    return this.http.post(this.config.base_url + this.config.find_node_dropdown_url, httpBody, httpOptions);
  }

}
export const DataProviderServiceToken = new InjectionToken<DataProviderConfig>('DataProviderConfig');
