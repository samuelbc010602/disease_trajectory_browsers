import {Component, Input, OnInit} from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";
import {SharedConfig} from "projects/shared/src/lib/shared.config";
import {Observable} from "rxjs";

@Component({
  selector: 'lib-shared',
  template: ``,
  styles: [
  ]
})
export class SharedComponent implements OnInit {

  @Input() env: any;
  public config: Observable<SharedConfig> | undefined;

  constructor(private sharedService: SharedService) {
  }

  ngOnInit() {
    this.config = this.sharedService.getConfig();
  }

}
