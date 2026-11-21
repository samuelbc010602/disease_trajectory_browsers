import { Component } from '@angular/core';
import { SharedService } from "projects/shared/src/lib/shared.service";

type Range = { min: number; max: number };

@Component({
  selector: 'lib-search-filters',
  templateUrl: './search-filters.component.html',
  styleUrls: ['./search-filters.component.css']
})
export class SearchFiltersComponent {

  public readonly defaults = this.sharedService.filterDefaults;

  constructor(public sharedService: SharedService) {}

  /** [temp (being edited), applied, default] for every range filter. */
  private get ranges(): Array<[Range, Range, Range]> {
    const s = this.sharedService;
    const d = this.defaults;
    return [
      [{min: s.minTrajectoryLength_temp, max: s.maxTrajectoryLength_temp},
       {min: s.minTrajectoryLength, max: s.maxTrajectoryLength},
       {min: d.minTrajectoryLength, max: d.maxTrajectoryLength}],
      [{min: s.minRelativeRisk_temp, max: s.maxRelativeRisk_temp},
       {min: s.minRelativeRisk, max: s.maxRelativeRisk},
       {min: d.minRelativeRisk, max: d.maxRelativeRisk}],
      [{min: s.minChapters_temp, max: s.maxChapters_temp},
       {min: s.minChapters, max: s.maxChapters},
       {min: d.minChapters, max: d.maxChapters}],
      [{min: s.minNumPatients_temp, max: s.maxNumPatients_temp},
       {min: s.minNumPatients, max: s.maxNumPatients},
       {min: d.minNumPatients, max: d.maxNumPatients}],
    ];
  }

  get hasPendingChanges(): boolean {
    return this.ranges.some(([t, a]) => t.min !== a.min || t.max !== a.max);
  }

  get anyModified(): boolean {
    return this.ranges.some(([t, , d]) => t.min !== d.min || t.max !== d.max);
  }

  // ---- Patients: shown as thousands above the 50,000 baseline every transition has ----
  readonly PATIENT_BASE = this.sharedService.cfg.patient_baseline ?? 50000;
  get patientsCeilK(): number {
    return Math.round((this.defaults.maxNumPatients - this.PATIENT_BASE) / 1000);
  }
  get patientsLowK(): number {
    return Math.max(0, Math.round((this.sharedService.minNumPatients_temp - this.PATIENT_BASE) / 1000));
  }
  set patientsLowK(k: number) {
    this.sharedService.minNumPatients_temp = this.PATIENT_BASE + Math.round(k) * 1000;
  }
  get patientsHighK(): number {
    return Math.max(0, Math.round((this.sharedService.maxNumPatients_temp - this.PATIENT_BASE) / 1000));
  }
  set patientsHighK(k: number) {
    this.sharedService.maxNumPatients_temp = this.PATIENT_BASE + Math.round(k) * 1000;
  }
  get patientsLabel(): string {
    return this.PATIENT_BASE > 0 ? `Patients above ${this.PATIENT_BASE.toLocaleString('en-US')}` : 'Number of patients';
  }
  get patientsTooltip(): string {
    const fmt = (n: number) => n.toLocaleString('en-US');
    return this.PATIENT_BASE > 0
      ? `Every transition in the data has at least ${fmt(this.PATIENT_BASE)} patients. Values are thousands of patients above that baseline: a minimum of 10 keeps transitions with at least ${fmt(this.PATIENT_BASE + 10000)} patients.`
      : 'Patients with each transition, in thousands: a minimum of 10 keeps transitions with at least 10,000 patients.';
  }
  get patientsHint(): string {
    const fmt = (n: number) => n.toLocaleString('en-US');
    const lo = this.PATIENT_BASE + this.patientsLowK * 1000;
    const hi = this.PATIENT_BASE + this.patientsHighK * 1000;
    if (this.patientsLowK === 0) {
      return this.PATIENT_BASE > 0
        ? `All transitions have at least ${fmt(this.PATIENT_BASE)} patients (up to ${fmt(hi)} shown).`
        : (this.sharedService.cfg.patient_note || `Showing transitions with up to ${fmt(hi)} patients.`);
    }
    return `Showing transitions with ${fmt(lo)} – ${fmt(hi)} patients.`;
  }

  removeSearchItem(item: any): void {
    this.sharedService.removeSearchItem(item);
  }

  resetAll(): void {
    const s = this.sharedService;
    const d = this.defaults;
    s.minTrajectoryLength_temp = d.minTrajectoryLength;
    s.maxTrajectoryLength_temp = d.maxTrajectoryLength;
    s.minRelativeRisk_temp = d.minRelativeRisk;
    s.maxRelativeRisk_temp = d.maxRelativeRisk;
    s.minChapters_temp = d.minChapters;
    s.maxChapters_temp = d.maxChapters;
    s.minNumPatients_temp = d.minNumPatients;
    s.maxNumPatients_temp = d.maxNumPatients;
  }

  public applyFilter(_event?: any) {
    const s = this.sharedService;
    s.minChapters = s.minChapters_temp;
    s.maxChapters = s.maxChapters_temp;

    s.minTrajectoryLength = s.minTrajectoryLength_temp;
    s.maxTrajectoryLength = s.maxTrajectoryLength_temp;

    s.minRelativeRisk = s.minRelativeRisk_temp;
    s.maxRelativeRisk = s.maxRelativeRisk_temp;

    s.minNumPatients = s.minNumPatients_temp;
    s.maxNumPatients = s.maxNumPatients_temp;

    s.filterApplied = true;
  }
}
