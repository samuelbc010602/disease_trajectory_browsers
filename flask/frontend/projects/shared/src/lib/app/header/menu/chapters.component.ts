import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { SRB_CHAPTERS } from 'projects/shared/src/lib/srb-chapters';
import { SharedService } from 'projects/shared/src/lib/shared.service';

@Component({
  selector: 'app-chapters-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule],
  template: `
    <div class="dlg-head">
      <div>
        <h2 mat-dialog-title>{{ title }}</h2>
        <p class="sub">{{ subtitle }}</p>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Close"><mat-icon>close</mat-icon></button>
    </div>

    <mat-dialog-content>
      <ul class="grid">
        <li *ngFor="let c of included" class="chap">
          <span class="swatch" [style.background]="c.color"></span>
          <img *ngIf="c.icon" class="icon" [src]="iconDir + c.icon" alt="" loading="lazy" />
          <span class="name">{{ c.name }}</span>
          <span class="code">{{ c.code }}</span>
        </li>
      </ul>

      <ng-container *ngIf="excluded.length">
        <h3 class="section">Not included in the browser data</h3>
        <ul class="grid">
          <li *ngFor="let c of excluded" class="chap chap--off">
            <span class="swatch" [style.background]="c.color"></span>
            <img *ngIf="c.icon" class="icon" [src]="iconDir + c.icon" alt="" loading="lazy" />
            <span class="name">{{ c.name }}</span>
            <span class="code">{{ c.code }}</span>
          </li>
        </ul>
      </ng-container>

      <p class="note" *ngIf="included.length">
        The code next to each chapter is the prefix of its {{ noun }} codes
        (e.g. <code>{{ included[0].code }}…</code> = {{ included[0].name }}).
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button class="close-btn" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; color: #1d2a18; }
    .dlg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    h2[mat-dialog-title] { font-size: 22px; font-weight: 600; margin: 0 0 4px; }
    .sub { margin: 0 0 12px; font-size: 13px; color: #7b8574; line-height: 1.4; }
    mat-dialog-content { max-height: 65vh; }
    .grid {
      list-style: none; margin: 0; padding: 0;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px;
    }
    .chap {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 10px; border-radius: 10px;
      border: 1px solid #e4e6da; background: #fafbf6;
      font-size: 13px;
    }
    .chap--off { opacity: .5; }
    .swatch { flex: none; width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }
    .icon { flex: none; width: 22px; height: 22px; object-fit: contain; }
    .name { flex: 1; min-width: 0; line-height: 1.25; }
    .code { flex: none; font-variant-numeric: tabular-nums; font-size: 11px; color: #7b8574;
            background: #eef0e4; padding: 2px 6px; border-radius: 6px; }
    .section { font-size: 12px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase;
               color: #7b8574; margin: 18px 0 8px; }
    .note { font-size: 12px; color: #7b8574; margin: 16px 0 0; }
    code { background: #eef0e4; padding: 0 4px; border-radius: 4px; }
    .close-btn { background: #233A1B !important; color: #fff !important; border-radius: 8px !important; }
  `]
})
export class ChaptersDialogComponent {
  readonly included: Array<{ code: string; name: string; color: string; icon?: string; inData: boolean }>;
  readonly excluded: Array<{ code: string; name: string; color: string; icon?: string; inData: boolean }>;
  readonly title: string;
  readonly subtitle: string;
  readonly iconDir: string;
  readonly noun: string;

  constructor(public dialogRef: MatDialogRef<ChaptersDialogComponent>, sharedService: SharedService) {
    const cfg = sharedService.cfg;
    const chapters = cfg.chapters || SRB_CHAPTERS;
    this.included = chapters.filter(c => c.inData);
    this.excluded = chapters.filter(c => !c.inData);
    this.title = cfg.chapters_title || 'Service Registry chapters';
    this.subtitle = cfg.chapters_subtitle || 'Primary care areas in the browser and the colour used for their services in the graph.';
    this.iconDir = cfg.chapters_icon_dir || 'assets/images/srb/';
    this.noun = cfg.item_noun || 'service';
  }

  close() {
    this.dialogRef.close();
  }
}
