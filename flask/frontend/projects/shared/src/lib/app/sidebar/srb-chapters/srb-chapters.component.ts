import { Component } from '@angular/core';
import { SRB_CHAPTERS } from 'projects/shared/src/lib/srb-chapters';
import { SharedService } from 'projects/shared/src/lib/shared.service';

@Component({
  selector: 'lib-srb-chapters',
  templateUrl: './srb-chapters.component.html',
  styleUrls: ['./srb-chapters.component.css']
})
export class SrbChaptersComponent {
  readonly chapters: Array<{ code: string; name: string; color: string; icon?: string; inData: boolean }>;
  readonly noun: string;

  constructor(sharedService: SharedService) {
    this.chapters = sharedService.cfg.chapters || SRB_CHAPTERS;
    this.noun = sharedService.cfg.item_noun || 'service';
  }
}
