import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { SharedService } from 'projects/shared/src/lib/shared.service';

/** Default About content (Service Registry Browser). Projects override it with `about` in their config. */
const SRB_ABOUT = {
  subtitle: 'The Danish Primary Care Browser',
  stats: [
    { value: '2.3 billion', label: 'primary care events' },
    { value: '8.1 million', label: 'patients' },
    { value: '1990–2020', label: 'study period' },
    { value: '24', label: 'harmonised care areas' },
  ],
  paragraphs: [
      "Primary care data often capture the earliest signs of disease, making them essential for reducing lead-time bias in computational approaches to early disease detection. A large-scale example of such a data foundation is the Danish National Health Service Registry (DNHSR), which contains more than 2.3 billion primary care events recorded over 30 years across the Danish population.",
      "In addition to general practice, the DNHSR includes fully linked specialty care events from dentistry, dermatology, physiotherapy, ophthalmology, otolaryngology, gynaecology, and many other areas. This comprehensive coverage enables detailed analysis of how patients transition between different primary care specialties over time.",
      "In this retrospective cohort study, we analysed data from 1990 to 2020, covering 8.1 million patients. The DNHSR data were consolidated and harmonised into 24 primary care areas tailored for disease progression analyses. Based on these data, we constructed population-scale primary care trajectories by identifying statistically significant event pairs and quantifying the strength and directionality of transitions between services."
  ],
  lead: "This interactive browser allows population-level exploration of primary care pathways, patient behaviour, and service usage patterns prior to disease diagnosis.",
};

@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule],
  template: `
    <div class="dlg-head">
      <div>
        <h2 mat-dialog-title>About</h2>
        <p class="sub">{{ about.subtitle }}</p>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Close"><mat-icon>close</mat-icon></button>
    </div>

    <mat-dialog-content>
      <div class="stats">
        <div class="stat" *ngFor="let s of about.stats"><strong>{{ s.value }}</strong><span>{{ s.label }}</span></div>
      </div>

      <p *ngFor="let p of about.paragraphs">{{ p }}</p>
      <p class="lead" *ngIf="about.lead">{{ about.lead }}</p>
      <ol class="refs" *ngIf="about.references?.length">
        <li *ngFor="let r of about.references">{{ r }}</li>
      </ol>
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
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 18px; }
    .stat { padding: 12px; border-radius: 12px; background: #F4F5E6; border: 1px solid #e4e6da; display: flex; flex-direction: column; gap: 2px; }
    .stat strong { font-size: 20px; font-weight: 600; color: #233A1B; font-variant-numeric: tabular-nums; }
    .stat span { font-size: 12px; color: #7b8574; }
    p { font-size: 14px; line-height: 1.6; color: #3c4535; margin: 0 0 12px; max-width: 70ch; }
    .lead { color: #1d2a18; font-weight: 500; border-left: 3px solid #c75b12; padding-left: 12px; }
    .refs { margin: 16px 0 0; padding-left: 20px; font-size: 12px; line-height: 1.5; color: #4d5545; }
    .refs li { margin-bottom: 4px; }
    .close-btn { background: #233A1B !important; color: #fff !important; border-radius: 8px !important; }
  `]
})
export class AboutDialogComponent {
  readonly about: { subtitle: string; stats: Array<{ value: string; label: string }>; paragraphs: string[]; lead?: string; references?: string[] };

  constructor(public dialogRef: MatDialogRef<AboutDialogComponent>, sharedService: SharedService) {
    this.about = sharedService.cfg.about || SRB_ABOUT;
  }

  close() {
    this.dialogRef.close();
  }
}
