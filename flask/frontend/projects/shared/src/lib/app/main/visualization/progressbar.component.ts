import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Observable, Subscription, timer, interval } from "rxjs";
import { SharedConfig } from "projects/shared/src/lib/shared.config";
import { SharedService } from "projects/shared/src/lib/shared.service";
import { CappedTrajectoriesDialog } from "./capped-trajectories-dialog.component";

@Component({
  selector: 'progressbar-dialog',
  template: `
    <h1 mat-dialog-title style="text-align: center">
      <strong class="progress-spinner">{{ loadingText }}</strong>
    </h1>
    <p>&nbsp;</p>
    <mat-progress-bar mode="query"></mat-progress-bar><br>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressbarComponent implements OnInit, OnDestroy {
  constructor(
    public dialog: MatDialog, 
    public sharedService: SharedService,
    private cdr: ChangeDetectorRef
  ) {}

  public configSub!: Subscription;
  public messageTimeoutSub: Subscription | null = null;
  public cappedCheckSub!: Subscription;
  private cappedAlertShown: boolean = false;
  public cancelled: boolean = false;

  public loadingText: string = '';

  ngOnInit(): void {
    console.log("in progress bar");
    // Subscribe to initial config
    this.configSub = this.sharedService.getConfig().subscribe(cfg => {
      this.loadingText = cfg.loading_dialog_text ?? "";
      this.cdr.markForCheck();
    });

    // After 13 seconds update the message
    this.messageTimeoutSub = timer(10_000).subscribe(() => {
        this.loadingText +=
          " This might take a while. Consider changing your filters.";
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.configSub) this.configSub.unsubscribe();
    if (this.messageTimeoutSub) this.messageTimeoutSub.unsubscribe();
    if (this.cappedCheckSub) this.cappedCheckSub.unsubscribe();
  }
}
