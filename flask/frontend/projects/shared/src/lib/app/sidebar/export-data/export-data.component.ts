import { Component, OnInit } from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";

@Component({
  selector: 'lib-export-data',
  templateUrl: './export-data.component.html',
  styleUrls: ['./export-data.component.css']
})
export class ExportDataComponent implements OnInit {

  public actionButtonsDisabled:boolean = false;
  public buttons:any;

  constructor(public sharedService: SharedService) { }

  ngOnInit(): void {
  }

  public downloadAs(value:string){
    this.sharedService.exportVisualizationAs = value;
    // Reset download type after X milliseconds
  }



}
