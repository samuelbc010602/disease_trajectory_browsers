import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter,
  Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges
} from '@angular/core';
import { Options } from '@angular-slider/ngx-slider';
import { Subscription } from 'rxjs';
import { SharedService } from 'projects/shared/src/lib/shared.service';

/**
 * A min/max range filter: slider + two numeric inputs that stay in sync.
 *
 * - Dragging the slider updates the inputs live.
 * - Typing in an input commits on Enter / blur (no jumping while you type),
 *   clamped to [floor, ceil] and kept on the right side of the other handle.
 * - `logScale` spreads wide ranges (e.g. 1 – 4,000,000 patients) evenly.
 */
@Component({
  selector: 'lib-range-filter',
  templateUrl: './range-filter.component.html',
  styleUrls: ['./range-filter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeFilterComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() label = '';
  @Input() tooltip = '';
  @Input() floor = 0;
  @Input() ceil = 100;
  @Input() step = 1;
  @Input() logScale = false;
  @Input() unit = '';
  @Input() hint = '';

  @Input() low = 0;
  @Input() high = 100;
  @Output() lowChange = new EventEmitter<number>();
  @Output() highChange = new EventEmitter<number>();

  public options: Options = {};
  public refresh = new EventEmitter<void>();
  private sub?: Subscription;
  private resizeObserver?: ResizeObserver;
  private lastWidth = 0;

  constructor(private sharedService: SharedService, private cdr: ChangeDetectorRef, private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.sub = this.sharedService.sidebarLayout$.subscribe(() => this.remeasure());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['floor'] || changes['ceil'] || changes['step'] || changes['logScale']) {
      const ticks = (this.ceil - this.floor) / this.step;
      this.options = {
        floor: this.floor,
        ceil: this.ceil,
        step: this.step,
        logScale: this.logScale && this.floor > 0,
        // Range starting at 0: log(1 + v) scale so small values stay easy to pick
        ...(this.logScale && this.floor <= 0 ? {
          customValueToPosition: (v: number, min: number, max: number) =>
            Math.log1p(v - min) / Math.log1p(max - min),
          customPositionToValue: (p: number, min: number, max: number) =>
            min + Math.expm1(p * Math.log1p(max - min)),
        } : {}),
        showTicks: !this.logScale && ticks <= 30,
        hidePointerLabels: true,
        hideLimitLabels: true,
        noSwitching: true,
        draggableRange: true,
        enforceStep: !this.logScale,
        precisionLimit: 6,
        ariaLabel: `${this.label} minimum`,
        ariaLabelHigh: `${this.label} maximum`,
      };
    }
  }

  ngAfterViewInit(): void {
    this.remeasure();
    // Re-measure whenever the filter's width changes (sidebar opening, scrollbar appearing, …)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        const w = Math.round(entries[0]?.contentRect.width || 0);
        if (w > 0 && w !== this.lastWidth) {
          this.lastWidth = w;
          this.remeasure();
        }
      });
      this.resizeObserver.observe(this.host.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  /** Slider was rendered while hidden (closed sidebar / inactive tab) -> width was 0. */
  private remeasure(): void {
    setTimeout(() => this.refresh.emit(), 0);
  }

  get isModified(): boolean {
    return this.low !== this.floor || this.high !== this.ceil;
  }

  get decimals(): number {
    const s = String(this.step);
    return s.includes('.') ? s.split('.')[1].length : 0;
  }

  /** Values shown in the inputs, rounded to the step precision. */
  display(v: number): string {
    if (v === null || v === undefined || isNaN(v)) { return ''; }
    return this.decimals ? v.toFixed(this.decimals) : String(Math.round(v));
  }

  onSliderLow(v: number): void {
    this.low = this.round(v);
    this.lowChange.emit(this.low);
  }

  onSliderHigh(v: number): void {
    this.high = this.round(v);
    this.highChange.emit(this.high);
  }

  commitLow(input: HTMLInputElement): void {
    const v = this.parse(input.value, this.floor);
    this.low = Math.min(v, this.high);
    input.value = this.display(this.low); // reflect clamping even if value didn't change
    this.lowChange.emit(this.low);
    this.cdr.markForCheck();
  }

  commitHigh(input: HTMLInputElement): void {
    const v = this.parse(input.value, this.ceil);
    this.high = Math.max(v, this.low);
    input.value = this.display(this.high);
    this.highChange.emit(this.high);
    this.cdr.markForCheck();
  }

  reset(): void {
    this.low = this.floor;
    this.high = this.ceil;
    this.lowChange.emit(this.low);
    this.highChange.emit(this.high);
    this.cdr.markForCheck();
  }

  private parse(text: string, fallback: number): number {
    const n = parseFloat(String(text).replace(/[\s,]/g, ''));
    if (isNaN(n)) { return fallback; }
    return this.round(Math.min(this.ceil, Math.max(this.floor, n)));
  }

  private round(v: number): number {
    const f = Math.pow(10, this.decimals);
    return Math.round(v * f) / f;
  }
}
