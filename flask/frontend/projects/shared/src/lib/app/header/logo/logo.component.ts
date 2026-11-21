import { Component, OnInit } from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";
import {Observable} from "rxjs";
import {SharedConfig} from "projects/shared/src/lib/shared.config";

@Component({
  selector: 'lib-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.css']
})
export class LogoComponent implements OnInit {

  constructor(public sharedService: SharedService) { }

  public config: Observable<SharedConfig> | undefined;

  ngOnInit(): void {
    this.config = this.sharedService.getConfig();
  }

}
