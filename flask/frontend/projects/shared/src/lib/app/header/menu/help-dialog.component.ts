import { Component, OnDestroy } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { SharedService } from 'projects/shared/src/lib/shared.service';

@Component({
  selector: 'app-help-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule],
  template: `
    <div class="dlg-head">
      <div>
        <h2 mat-dialog-title>Help</h2>
        <p class="sub">How to use the {{ title }}</p>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Close"><mat-icon>close</mat-icon></button>
    </div>

    <mat-dialog-content>
      <ol class="steps">
        <li *ngFor="let s of steps; let i = index">
          <span class="num">{{ i + 1 }}</span>
          <div>
            <div class="title">{{ s.title }}</div>
            <p>{{ s.text }}</p>
            <div class="ui" *ngIf="s.icons.length || s.chips">
              <span class="ui-chips" *ngIf="s.chips">
                <span class="seg">Both</span><span class="seg">Men</span><span class="seg">Women</span>
              </span>
              <span class="ui-icon" *ngFor="let ic of s.icons" [title]="ic.label">
                <mat-icon>{{ ic.icon }}</mat-icon><small>{{ ic.label }}</small>
              </span>
            </div>
          </div>
        </li>
      </ol>

      <h3 class="section">Walkthrough</h3>
      <div class="player" (mouseenter)="hover = true" (mouseleave)="hover = false">
        <div class="screen">
          <img *ngFor="let f of frames; let i = index" [src]="f.img" [alt]="f.title" loading="lazy"
               [class.on]="i === current" [class.kb]="i === current && playing" />
          <div class="caption">
            <span class="cap-step">{{ current + 1 }} / {{ frames.length }}</span>
            <strong>{{ frames[current].title }}</strong>
            <span>{{ frames[current].text }}</span>
          </div>
        </div>
        <div class="bar"><span [style.width.%]="progress"></span></div>
        <div class="controls">
          <button mat-icon-button (click)="prev()" aria-label="Previous"><mat-icon>skip_previous</mat-icon></button>
          <button mat-icon-button (click)="toggle()" [attr.aria-label]="playing ? 'Pause' : 'Play'">
            <mat-icon>{{ playing ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
          <button mat-icon-button (click)="next()" aria-label="Next"><mat-icon>skip_next</mat-icon></button>
          <div class="chapters">
            <button *ngFor="let f of frames; let i = index" class="chap-dot" [class.on]="i === current"
                    [class.seen]="i < current" (click)="go(i)" [attr.aria-label]="f.title" [title]="f.title"></button>
          </div>
        </div>
      </div>
      <p class="yt" *ngIf="videoLink">Prefer the narrated video? <a [href]="videoLink" target="_blank" rel="noopener">Open the original video on YouTube</a>.</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button class="close-btn" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; color: #1d2a18; }
    .dlg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    h2[mat-dialog-title] { font-size: 22px; font-weight: 600; margin: 0 0 4px; }
    .sub { margin: 0 0 12px; font-size: 13px; color: #7b8574; }
    mat-dialog-content { max-height: 70vh; }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
    .steps li { display: flex; gap: 12px; padding: 12px; border: 1px solid #e4e6da; border-radius: 12px; background: #fafbf6; }
    .num { flex: none; width: 24px; height: 24px; border-radius: 50%; background: #233A1B; color: #fff;
           display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; }
    .title { display: flex; align-items: center; gap: 6px; font-weight: 500; font-size: 14px; margin-bottom: 4px; }
    .ui { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .ui-icon { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px 3px 4px;
               border-radius: 8px; background: #fff; border: 1px solid #e4e6da; }
    .ui-icon mat-icon { font-size: 18px; width: 18px; height: 18px; color: #233A1B; }
    .ui-icon small { font-size: 11px; color: #4d5545; }
    .ui-chips { display: inline-flex; border: 1px solid #cfd3c2; border-radius: 999px; overflow: hidden; font-size: 11px; }
    .seg { padding: 3px 9px; background: #fff; }
    .seg:first-child { background: #233A1B; color: #fff; }
    .steps p { margin: 0; font-size: 13px; line-height: 1.45; color: #4d5545; }
    .section { font-size: 12px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; color: #7b8574; margin: 20px 0 8px; }
    .player { border-radius: 12px; overflow: hidden; border: 1px solid #e4e6da; background: #fff;
              box-shadow: 0 8px 24px -12px rgba(0,0,0,.35); }
    .screen { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: #f4f5e6; }
    .screen img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center;
                  opacity: 0; transition: opacity .6s ease; }
    .screen img.on { opacity: 1; }
    .screen img.kb { animation: kb 6s ease-out both; }
    @keyframes kb { from { transform: scale(1); } to { transform: scale(1.04); } }
    .caption { position: absolute; left: 12px; right: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 2px;
               padding: 10px 14px; border-radius: 10px; background: rgba(29, 42, 24, .88); color: #fff;
               font-size: 13px; line-height: 1.4; backdrop-filter: blur(4px); }
    .caption strong { font-size: 14px; }
    .cap-step { font-size: 10.5px; letter-spacing: .06em; opacity: .7; }
    .bar { height: 3px; background: #e4e6da; }
    .bar span { display: block; height: 100%; background: #c75b12; transition: width .1s linear; }
    .controls { display: flex; align-items: center; gap: 2px; padding: 4px 8px; }
    .controls mat-icon { color: #233A1B; }
    .chapters { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
    .chap-dot { width: 10px; height: 10px; padding: 0; border-radius: 50%; border: 0; background: #d9ddca; cursor: pointer; }
    .chap-dot.seen { background: #8c9483; }
    .chap-dot.on { background: #c75b12; transform: scale(1.2); }
    .yt { font-size: 12px; color: #7b8574; margin: 10px 0 0; }
    .yt a { color: #233A1B; }
    @media (prefers-reduced-motion: reduce) { .screen img.kb { animation: none; } }
    .close-btn { background: #233A1B !important; color: #fff !important; border-radius: 8px !important; }
  `]
})
export class HelpDialogComponent implements OnDestroy {
  // Screenshots of the current app (projects/srb/src/assets/images/walkthrough/)
  readonly frames: Array<{ img: string; title: string; text: string }>;
  private readonly srbFrames = [
    { img: 'assets/images/walkthrough/01-landing.png', title: 'Start here',
      text: 'Choose Both, Men or Women, then search in the bar at the top — or open the short guide.' },
    { img: 'assets/images/walkthrough/02-dropdown.png', title: 'Search for a service',
      text: 'Type part of a service name. Suggestions show the chapter above each service.' },
    { img: 'assets/images/walkthrough/03-graph.png', title: 'Trajectories are drawn',
      text: 'All trajectories containing the service are shown, centred, ten per page. Edge thickness and shade show the number of patients.' },
    { img: 'assets/images/walkthrough/04-addcode.png', title: 'Add another code',
      text: 'Keep typing in the search bar to restrict the trajectories further.' },
    { img: 'assets/images/walkthrough/05-chips.png', title: 'Every code is a chip',
      text: 'Only trajectories containing all selected codes remain. The first code is dark, extra codes are joined with AND.' },
    { img: 'assets/images/walkthrough/06-removed.png', title: 'Remove a code',
      text: 'Click × on a chip and the trajectories reload using the remaining codes.' },
    { img: 'assets/images/walkthrough/07-details.png', title: 'Inspect a service',
      text: 'Click a node or an edge to see its chapter, its trajectory, neighbouring services, patients and relative risk.' },
    { img: 'assets/images/walkthrough/08-filters.png', title: 'Filter',
      text: 'Open the side panel to set trajectory length, relative risk, chapters and patients — drag the sliders or type exact values.' },
    { img: 'assets/images/walkthrough/09-filtered.png', title: 'Apply filters',
      text: 'Press Apply filters to update the graph. Reset restores the full range.' },
    { img: 'assets/images/walkthrough/10-network.png', title: 'Network view',
      text: 'With Men or Women selected, switch on Network view to merge all trajectories into one graph.' },
    { img: 'assets/images/walkthrough/11-chapters.png', title: 'Chapters & colours',
      text: 'The Chapters page lists every service chapter and the colour used for it in the graph.' },
  ];
  readonly frameMs = 6000;
  current = 0;
  playing = true;
  hover = false;
  progress = 0;
  private timer: any;
  private elapsed = 0;

  // Icons are exactly the ones shown in the app for each control
  steps = [
    { title: 'Choose population', chips: true, icons: [] as { icon: string; label: string }[],
      text: 'Pick Both, Men or Women next to the search bar. The network view switch appears when Men or Women is selected.' },
    { title: 'Search for a service', chips: false, icons: [{ icon: 'search', label: 'Search bar' }],
      text: 'Type at least two letters of a service description, chapter name or service code and pick a result. All trajectories containing that service are drawn.' },
    { title: 'Add more codes', chips: false, icons: [],
      text: 'Keep typing in the search bar to add further codes. Only trajectories containing all selected codes are shown. Each code appears as a chip in the search bar, coloured by chapter.' },
    { title: 'Remove codes', chips: false, icons: [{ icon: 'close', label: 'Remove code' }, { icon: 'backspace', label: 'Remove all' }],
      text: 'Click × on a chip to remove that code; the trajectories are reloaded using the remaining codes. Removing the last code returns to the start page.' },
    { title: 'Filter', chips: false, icons: [{ icon: 'tune', label: 'Side panel' }, { icon: 'filter_alt', label: 'Apply filters' }, { icon: 'restart_alt', label: 'Reset' }],
      text: 'Open the side panel to restrict trajectory length, relative risk, number of chapters and number of patients. Drag the sliders or type exact values, then press Apply filters.' },
    { title: 'Explore the graph', chips: false, icons: [
        { icon: 'zoom_in', label: 'Zoom in' }, { icon: 'zoom_out', label: 'Zoom out' }, { icon: 'zoom_out_map', label: 'Fit' },
        { icon: 'navigate_before', label: 'Incoming' }, { icon: 'navigate_next', label: 'Outgoing' },
        { icon: 'select_all', label: 'Inverse' }, { icon: 'compare_arrows', label: 'Trajectory' },
        { icon: 'view_module', label: 'Show/hide toolbar' }],
      text: 'Click a node or an edge to see its details in the side panel. Use the toolbar to zoom and to select incoming/outgoing edges or whole trajectories.' },
  ];


  readonly videoLink: string;
  readonly title: string;

  constructor(public dialogRef: MatDialogRef<HelpDialogComponent>, sharedService: SharedService) {
    const cfg = sharedService.cfg;
    this.frames = cfg.walkthrough || this.srbFrames;
    this.videoLink = cfg.help_video_url !== undefined ? cfg.help_video_url : 'https://www.youtube.com/watch?v=pN19Q_0wuRE';
    this.title = cfg.title || 'browser';
    const noun = cfg.item_noun || 'service';
    const sexToggle = cfg.show_sex_toggle !== false;
    this.steps = this.steps
      .filter(st => sexToggle || st.title !== 'Choose population')
      .map(st => ({ ...st, title: st.title.replace(/service/g, noun), text: st.text.replace(/service/g, noun) }));
    if (cfg.network_requires_sex === false) {
      this.steps = this.steps.map(st => ({ ...st, text: st.text.replace('The network view switch appears when Men or Women is selected.', '') }));
    }
    // Plays through once, then stops on the last frame (no endless loop); pauses while hovered.
    this.timer = setInterval(() => {
      if (!this.playing || this.hover) { return; }
      this.elapsed += 100;
      this.progress = Math.min(100, ((this.current + this.elapsed / this.frameMs) / this.frames.length) * 100);
      if (this.elapsed >= this.frameMs) {
        if (this.current < this.frames.length - 1) { this.current++; this.elapsed = 0; }
        else { this.playing = false; this.progress = 100; }
      }
    }, 100);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  go(i: number): void {
    this.current = Math.max(0, Math.min(this.frames.length - 1, i));
    this.elapsed = 0;
    this.progress = (this.current / this.frames.length) * 100;
  }
  next(): void { this.go(this.current + 1); }
  prev(): void { this.go(this.current - 1); }
  toggle(): void {
    if (!this.playing && this.current === this.frames.length - 1) { this.go(0); }
    this.playing = !this.playing;
  }

  close() {
    this.dialogRef.close();
  }
}
