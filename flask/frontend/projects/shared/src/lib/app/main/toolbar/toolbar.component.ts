import { Component, OnInit, ViewChild } from '@angular/core';
import { SharedService } from '../../../shared.service'; 

@Component({
  selector: 'lib-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {
  public currentZoomLevel = 1;
  constructor(public sharedService: SharedService) { }

  ngOnInit(): void {
  }

  /** value > 0 zoom in, < 0 zoom out, 0 = fit the whole graph and center it */
  public zoomCytoscape(value: number){
    this.sharedService.setZoomLevel(value);
  }

  public markIncomingNodes(){
    this.sharedService.markEdgeSelection('incoming')
  }
  
  public markOutgoingNodes(){
    this.sharedService.markEdgeSelection('outgoing')

  }
  public markInverse(){
    this.sharedService.markEdgeSelection('inverse')
  }

  public markTrajectory(){
    this.sharedService.markEdgeSelection('trajectory')
  }

  public deleteSelectedElements(){
    
  }

  public undoAction(){

  }

  public redoAction(){

  }

  public runLayout(){

  }
}
