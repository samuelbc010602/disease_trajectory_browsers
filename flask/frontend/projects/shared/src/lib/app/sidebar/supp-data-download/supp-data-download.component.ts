import {Component, OnInit } from '@angular/core';
import {DataProviderService} from "projects/shared/src/lib/data-provider.service";
import * as FileSaver from "file-saver";
import {Observable} from "rxjs";
import {SharedConfig} from "projects/shared/src/lib/shared.config";
import {SharedService} from "projects/shared/src/lib/shared.service";
import {DataProviderConfig} from "projects/shared/src/lib/data-provider.config";

@Component({
  selector: 'lib-supp-data-download',
  templateUrl: './supp-data-download.component.html',
  styleUrls: ['./supp-data-download.component.css']
})
export class SuppDataDownloadComponent implements OnInit {

  public config: Observable<SharedConfig> | undefined;
  public dataConfig: Observable<DataProviderConfig> | undefined;

  constructor(public dataProviderService: DataProviderService, public sharedService: SharedService) {
  }

  ngOnInit(): void {
    this.config = this.sharedService.getConfig();
    this.dataConfig = this.dataProviderService.getConfig();
  }

  downloadSupplementaryData(gender: 'men' | 'women'){
    // Serve files from the frontend assets folder: /assets/download/pairs_data_men.tsv
    const filename = `pairs_data_${gender}.tsv`;
    const assetPath = `/assets/download/${filename}`;

    fetch(assetPath)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch ${assetPath}: ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        FileSaver.saveAs(blob, filename);
      })
      .catch(err => {
        console.error('Error downloading supplementary file:', err);
        // Fallback: try backend endpoint if available
        this.dataProviderService.supplementaryDataDownload$().subscribe({
          next: value => {
            FileSaver.saveAs(new File([JSON.stringify(value)], filename, {type: 'text/plain;charset=utf-8'}));
          },
          error: e => console.error('Backend fallback failed', e)
        });
      });
  }


}
