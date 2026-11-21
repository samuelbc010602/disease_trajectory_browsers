import { Component } from "@angular/core";
import { MatDialogRef, MatDialogModule } from "@angular/material/dialog";

@Component({
  selector: "capped-trajectories-dialog",
  standalone: true,
  template: `
    <h2 mat-dialog-title>Alert: Trajectories are capped</h2>
    <mat-dialog-content>
     Trajectories are limited to a maximum length of 3 due to the large volume of data to visualize. You may increase this limit in the filter settings; however, please note that doing so can significantly increase processing time and may cause your browser to become unresponsive.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button color="primary" (click)="onClose()">OK</button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogModule],
})
export class CappedTrajectoriesDialog {
  constructor(public dialogRef: MatDialogRef<CappedTrajectoriesDialog>) {}

  onClose() {
    this.dialogRef.close();
  }
}
