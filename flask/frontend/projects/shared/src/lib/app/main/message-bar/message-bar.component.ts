import { Component, OnInit } from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";
import {PageEvent} from "@angular/material/paginator";

@Component({
  selector: 'lib-message-bar',
  templateUrl: './message-bar.component.html',
  styleUrls: ['./message-bar.component.css']
})
export class MessageBarComponent implements OnInit {

  constructor(public sharedService:SharedService) { }

  ngOnInit(): void {
  }

  public _showFilteredOutNodesFromNetwork = false;
  public _showOverloadWarning = false;
  public nodeNodes = 0;
  public nodesFilteredOut = 0;
  public pageSize = 10;
  public pageIndex = 0;
  public _pageSizeOptions = [5, 10, 25, 50, 75];

  handlePageEvent(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.sharedService.pageIndex = this.pageIndex;
    this.sharedService.pageSize = this.pageSize;
    this.sharedService.filterApplied = true;

    /*this.sharedService.sendMessage(SharedService.PAGINATION, true);
    this.searchBarService.sendMessage(SearchBarService.SHOW_PROGRESS_BAR_TYPE, true); // Start progress bar
    this.updateCytoscapeCanvas(this.updateCytoscapeWithFindNode);
    */
  }

}
