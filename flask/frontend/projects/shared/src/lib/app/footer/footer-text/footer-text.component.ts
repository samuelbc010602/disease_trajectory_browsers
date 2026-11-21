import { Component, OnInit } from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";
import {Observable} from "rxjs";
import {SharedConfig} from "projects/shared/src/lib/shared.config";

@Component({
  selector: 'lib-footer-text',
  templateUrl: './footer-text.component.html',
  styleUrls: ['./footer-text.component.css']
})
export class FooterTextComponent implements OnInit {


  constructor(protected sharedService: SharedService) { }

  public config: Observable<SharedConfig> | undefined;

  ngOnInit(): void {
    this.config = this.sharedService.getConfig();
  }

  public _showFooter: boolean = true;
}
