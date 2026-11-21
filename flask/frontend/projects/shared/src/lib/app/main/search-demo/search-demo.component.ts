import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit
} from '@angular/core';
import { SharedService } from 'projects/shared/src/lib/shared.service';

interface DemoNode { id: string; x: number; y: number; color: string; label: string; filtered?: boolean; hit?: boolean; }
interface DemoEdge { from: string; to: string; filtered?: boolean; }

/**
 * On-demand illustration of how to use the browser, shown on the
 * landing page beneath the search bar: type -> pick from dropdown -> graph is
 * drawn -> narrow it with a filter. Pure DOM/SVG, no backend calls.
 */
@Component({
  selector: 'lib-search-demo',
  templateUrl: './search-demo.component.html',
  styleUrls: ['./search-demo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchDemoComponent implements OnInit, OnDestroy {
  open = false;       // guide expanded
  playing = false;    // animation running
  query = 'physio';
  options = [
    'Physiotherapy and Rehabilitation : Individual exercise therapy',
    'Physiotherapy and Rehabilitation : Follow-up training therapy',
    'Physiotherapy and Rehabilitation : Apparatus treatment',
  ];
  chip = 'Physiotherapy : Individual exercise therapy';
  steps = [
    'Search for a service or specialty',
    'Pick it — trajectories containing it are drawn',
    'Narrow them down with the filters in the side panel',
  ];

  // Linear view: one row per trajectory, the searched item repeated in each row.
  nodes: DemoNode[] = [
    { id: 'gp1',    x: 46,  y: 34,  color: '#57341f', label: 'General practice' },
    { id: 'ortho1', x: 156, y: 34,  color: '#75cd95', label: 'Orthopaedics' },
    { id: 'phys1',  x: 266, y: 34,  color: '#bdb963', label: 'Exercise therapy', hit: true },
    { id: 'train1', x: 374, y: 34,  color: '#bdb963', label: 'Follow-up training' },
    { id: 'gp2',    x: 46,  y: 92,  color: '#57341f', label: 'General practice' },
    { id: 'xray2',  x: 156, y: 92,  color: '#ff9290', label: 'Chest X-ray' },
    { id: 'phys2',  x: 266, y: 92,  color: '#bdb963', label: 'Exercise therapy', hit: true },
    { id: 'phys3',  x: 46,  y: 150, color: '#bdb963', label: 'Exercise therapy', hit: true, filtered: true },
    { id: 'lab3',   x: 156, y: 150, color: '#ff9b50', label: 'Lab test', filtered: true },
  ];
  edges: DemoEdge[] = [
    { from: 'gp1', to: 'ortho1' }, { from: 'ortho1', to: 'phys1' }, { from: 'phys1', to: 'train1' },
    { from: 'gp2', to: 'xray2' }, { from: 'xray2', to: 'phys2' },
    { from: 'phys3', to: 'lab3', filtered: true },
  ];

  typed = '';
  phase = 0;          // 0 idle, 1 typing, 2 dropdown, 3 selected+graph, 4 filter panel, 5 filtered, 6 fade-out
  activeOption = -1;
  rr = 1.0;
  reducedMotion = false;

  private timers: any[] = [];
  private readonly nodeById = new Map<string, DemoNode>();

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef, sharedService: SharedService) {
    const demo = sharedService.cfg.demo;
    const noun = sharedService.cfg.item_noun || 'service';
    if (demo) {
      this.query = demo.query; this.options = demo.options; this.chip = demo.chip;
      this.nodes = demo.nodes; this.edges = demo.edges;
    }
    this.steps = this.steps.map(st => st.replace('a service or specialty', 'a ' + noun));
    this.nodes.forEach(n => this.nodeById.set(n.id, n));
  }

  get step(): number {
    return this.phase >= 4 ? 2 : this.phase >= 3 ? 1 : 0;
  }

  node(id: string): DemoNode {
    return this.nodeById.get(id)!;
  }

  /** Curved path between two nodes (stops short of the target circle for the arrow). */
  edgePath(e: DemoEdge): string {
    const a = this.node(e.from), b = this.node(e.to);
    const r = 13;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const sx = a.x + (dx / len) * r, sy = a.y + (dy / len) * r;
    const ex = b.x - (dx / len) * (r + 4), ey = b.y - (dy / len) * (r + 4);
    const mx = (sx + ex) / 2;
    return `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`;
  }

  ngOnInit(): void {
    this.reducedMotion = typeof window !== 'undefined' && !!window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /** Open the guide and play it once (nothing runs until the user asks). */
  start(): void {
    this.open = true;
    if (this.reducedMotion) { this.jump(2); return; }
    // Timers outside Angular so the demo never triggers app-wide change detection.
    this.zone.runOutsideAngular(() => this.play());
  }

  close(): void {
    this.stop();
    this.open = false;
    this.phase = 0;
  }

  /** Show the end state of a step without animating (clicking a step). */
  jump(step: number): void {
    this.stop();
    this.open = true;
    this.activeOption = -1;
    if (step === 0) { this.typed = this.query; this.phase = 2; this.activeOption = 0; this.rr = 1.0; }
    if (step === 1) { this.typed = this.query; this.phase = 3; this.rr = 1.0; }
    if (step === 2) { this.typed = this.query; this.phase = 5; this.rr = 2.5; }
  }

  private stop(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.playing = false;
  }

  private at(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(() => { fn(); this.cdr.detectChanges(); }, ms));
  }

  private play(): void {
    this.stop();
    this.playing = true;
    this.typed = ''; this.phase = 0; this.activeOption = -1; this.rr = 1.0;
    this.cdr.detectChanges();

    let t = 600;
    this.at(t, () => this.phase = 1);
    for (let i = 1; i <= this.query.length; i++) {
      t += 120;
      this.at(t, () => this.typed = this.query.slice(0, i));
    }
    this.at(t += 250, () => this.phase = 2);
    this.at(t += 500, () => this.activeOption = 0);
    this.at(t += 700, () => { this.phase = 3; this.activeOption = -1; });
    this.at(t += 2600, () => this.phase = 4);
    // Animate the relative-risk handle 1.0 -> 2.5
    t += 600;
    for (let i = 1; i <= 15; i++) {
      this.at(t + i * 60, () => this.rr = Math.round((1 + i * 0.1) * 10) / 10);
    }
    this.at(t += 15 * 60 + 150, () => { this.phase = 5; this.playing = false; });  // ends here, no loop
  }
}
