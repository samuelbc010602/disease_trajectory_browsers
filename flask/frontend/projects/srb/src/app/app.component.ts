import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit} from '@angular/core';
import { environment } from '../environments/environment';
import {
  NgcCookieConsentService,
  NgcInitializeEvent,
  NgcNoCookieLawEvent,
  NgcStatusChangeEvent
} from "ngx-cookieconsent";
import {config, Subscription} from "rxjs";
import {SharedService} from "projects/shared/src/lib/shared.service";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {SharedConfig} from "projects/shared/src/lib/shared.config";
import {Observable} from "rxjs";

@Component({
  selector: 'srb-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('searchBarIsAtTop', [
      // The search bar always lives in the header (landing page included)
      state('false', style({ position: 'relative', left: '0px', top: '0px' })),
      state('true' , style({ position: 'relative', left: '0px', top: '0px' })),
    ])]
})
export class SRBComponent implements OnInit, AfterViewInit, OnDestroy {
  private headerObserver?: ResizeObserver;
  title = 'srb';
  env = environment;
  searchBarIsAtTop = false;

  constructor(public sharedService: SharedService, private ccService: NgcCookieConsentService, private host: ElementRef<HTMLElement>) {}

  /** Publish the header's real height as --srb-header-h so the main area fills exactly the rest of the window. */
  ngAfterViewInit() {
    const header = this.host.nativeElement.querySelector('header');
    if (!header) { return; }
    const publish = () => document.documentElement.style.setProperty('--srb-header-h', header.getBoundingClientRect().height + 'px');
    publish();
    if (typeof ResizeObserver !== 'undefined') {
      this.headerObserver = new ResizeObserver(publish);
      this.headerObserver.observe(header);
    }
  }

  //keep refs to subscriptions to be able to unsubscribe later
  private popupOpenSubscription!: Subscription;
  private popupCloseSubscription!: Subscription;
  private initializeSubscription!: Subscription;
  private statusChangeSubscription!: Subscription;
  private revokeChoiceSubscription!: Subscription;
  private noCookieLawSubscription!: Subscription;

  ngOnInit() {
    // subscribe to cookieconsent observables to react to main events
    this.popupOpenSubscription = this.ccService.popupOpen$.subscribe(
      () => {
        console.log('popupOpen');
        // you can use this.ccService.getConfig() to do stuff...
      });

    this.popupCloseSubscription = this.ccService.popupClose$.subscribe(
      () => {
        console.log('popupClose');

        // you can use this.ccService.getConfig() to do stuff...
      });

    this.initializeSubscription = this.ccService.initialize$.subscribe(
      (event: NgcInitializeEvent) => {
        // you can use this.ccService.getConfig() to do stuff...
        console.log(`initialize: ${JSON.stringify(event)}`);
      });

    this.statusChangeSubscription = this.ccService.statusChange$.subscribe(
      (event: NgcStatusChangeEvent) => {
        // you can use this.ccService.getConfig() to do stuff...
        console.log(`statusChange: ${JSON.stringify(event)}`);
        if(event.status == 'allow'){
          console.log('Start tracking people with Google Analytics...');
        }
      });

    this.revokeChoiceSubscription = this.ccService.revokeChoice$.subscribe(
      () => {
        // you can use this.ccService.getConfig() to do stuff...
        console.log(`revokeChoice`);
      });

    this.noCookieLawSubscription = this.ccService.noCookieLaw$.subscribe(
      (event: NgcNoCookieLawEvent) => {
        // you can use this.ccService.getConfig() to do stuff...
        console.log(`noCookieLaw: ${JSON.stringify(event)}`);
      });
  }

  ngOnDestroy() {
    this.headerObserver?.disconnect();
    // unsubscribe to cookieconsent observables to prevent memory leaks
    this.popupOpenSubscription.unsubscribe();
    this.popupCloseSubscription.unsubscribe();
    this.initializeSubscription.unsubscribe();
    this.statusChangeSubscription.unsubscribe();
    this.revokeChoiceSubscription.unsubscribe();
    this.noCookieLawSubscription.unsubscribe();
  }


}
