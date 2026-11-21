import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { SharedService } from "projects/shared/src/lib/shared.service";
import { MatDialog } from '@angular/material/dialog';
import { HelpDialogComponent } from './help-dialog.component';
import { AboutDialogComponent } from './about-dialog.component';
import { ChaptersDialogComponent } from './chapters.component';

@Component({
  selector: 'lib-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  constructor(
    public router: Router,
    public sharedService: SharedService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  public toggleMenu() {
    this.sharedService.sideBarIsOpen = !this.sharedService.sideBarIsOpen;
  }

  public toggleToolbar() {
    this.sharedService.toolbarIsOn = !this.sharedService.toolbarIsOn;
  }

  public goHelp() {
    this.dialog.open(HelpDialogComponent, { width: '860px', maxWidth: '94vw', maxHeight: '90vh', autoFocus: false });
  }

  public goAbout() {
    this.dialog.open(AboutDialogComponent, { width: '760px', maxWidth: '94vw', maxHeight: '90vh', autoFocus: false });
  }

  public goChapters(){
    this.dialog.open(ChaptersDialogComponent, { width: '820px', maxWidth: '94vw', maxHeight: '90vh', autoFocus: false });
  }
}
