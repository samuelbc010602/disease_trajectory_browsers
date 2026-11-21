import {AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {PageEvent} from "@angular/material/paginator";
import {SharedService} from "projects/shared/src/lib/shared.service";

@Component({
  selector: 'lib-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent implements OnInit, OnChanges, AfterViewInit {

  constructor(public sharedService:SharedService) {
  }

  @Input() elements: any = this.sharedService.visualizationElements;
  public _cytoscapeElementData:any;

  public selected:boolean = false;
  public listOfSelected:boolean = false;
  public actionButtonsDisabled:boolean = false;

  ngOnInit(): void {
  }
  public handlePageEvent(event: PageEvent) {
  }

  ngOnChanges(changes: SimpleChanges): void {

  }

  ngAfterViewInit(): void {
  }


}
