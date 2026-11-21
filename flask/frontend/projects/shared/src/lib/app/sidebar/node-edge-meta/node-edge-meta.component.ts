import {Component, Input, OnChanges, OnInit, Pipe, PipeTransform, SimpleChanges} from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";
import {DataProviderService} from "projects/shared/src/lib/data-provider.service";
import {SRB_CHAPTERS, findChapter} from "projects/shared/src/lib/srb-chapters";

@Pipe({name: 'replace'})
export class ReplacePipe implements PipeTransform {
  transform(value: string, strToReplace: string, replacementStr: string): string {

    if(!value || ! strToReplace || ! replacementStr)
    {
      return value;
    }

    return value.replace(new RegExp(strToReplace, 'g'), replacementStr);
  }
}
@Component({
  selector: 'lib-node-edge-meta',
  templateUrl: './node-edge-meta.component.html',
  styleUrls: ['./node-edge-meta.component.css']
})
export class NodeEdgeMetaComponent implements OnInit, OnChanges {

  public multipleElementsSelected:boolean = false;
  public numOfSelected:number = 0;
  public nodeType:boolean = false;
  public nodeData:any;
  public color:any;
  public currentSelectedElement:any;
  public sourceColor:any;
  public targetColor:any;
  public sourceName:any;
  public targetName:any;
  public sourceText:any;
  public targetText:any;
  public edgeData:any;
  public shared_name: string = '';
  public sourceChapter: string = '';
  public targetChapter: string = '';
  public selectedArray = new Array<any>();
  public aux: any = null;
  public loading = false;

  /** Chapter (name + graph colour) from the first two digits of a service code. */
  chapterOf(code: any): { name: string; color: string } {
    const c = findChapter(this.sharedService.cfg.chapters || SRB_CHAPTERS, code);
    return c ? { name: c.name, color: c.color } : { name: '', color: '#8c9483' };
  }

  fmtInt(v: any): string {
    const n = Number(v);
    return isFinite(n) && v !== null && v !== undefined && v !== '' ? Math.round(n).toLocaleString('en-US') : '–';
  }

  fmtRR(v: any): string {
    const n = Number(v);
    return isFinite(n) && v !== null && v !== undefined ? n.toFixed(2) : '–';
  }

  fmtP(v: any): string {
    const n = Number(v);
    if (!isFinite(n) || v === null || v === undefined) { return '–'; }
    if (n === 0) { return '< 1e-300'; }
    return n < 0.001 ? n.toExponential(1) : n.toFixed(3);
  }

  /** days -> "2.3 years" / "7 months" */
  fmtDuration(days: any): string {
    const d = Number(days);
    if (!isFinite(d) || days === null || days === undefined) { return '–'; }
    return d >= 365 ? `${(d / 365.25).toFixed(1)} years` : `${Math.round(d / 30.44)} months`;
  }

  fmtYears(days: any): string {
    const d = Number(days);
    return isFinite(d) && days !== null && days !== undefined ? `${(d / 365.25).toFixed(0)} years` : '–';
  }

  sexLabel(g: any): string {
    return g === 'male' ? 'Men' : g === 'female' ? 'Women' : '';
  }
  @Input() public deselect:any;


  public _networkToggled:boolean = false;
  @Input() public elements:any

  constructor(public sharedService: SharedService, public dataProviderService: DataProviderService) {
  }

  ngOnInit(): void {
  }

  public deleteElement(element:any){

  }

  public getNodeColor(code:string){

  }

  ngOnChanges(changes: SimpleChanges): void {

    //console.log(changes);

    if (changes['elements']?.currentValue !== undefined) {

      if (!Array.isArray(changes['elements'].currentValue)) {
        this.sharedService.areMultipleElementsSelected = false;
        this.selectedArray = [];
        this.aux = this.elements.aux || null;
        this.loading = true;

        this.dataProviderService.getElementMetaData$(this.elements.group, this.elements.data.gender_trajectories, this.elements.data.id, this.elements.data.shared_name, this.sharedService.isNetworkedSearchOngoing)
          .subscribe(
            response => {
              this.loading = false;
              console.log("RESPONSE FOR META DATA: ", response);
              if (this.elements.group === 'nodes') {
                console.log("NODE RESPONSE DATA: ", response);
                this.nodeData = response.data;
                this.color = 'rgb(' + response.data.color + ')';
                this.sharedService.isSingleElementSelected = true;
                this.nodeType = true;
              } else if (this.elements.group === 'edges') {
                // Counts are stored per trajectory: prefer the values of the edge that was clicked
                const own: any = {};
                for (const k of ['patient_count', 'relativerisk', 'time_days_delta', 'male_patient_count', 'female_patient_count']) {
                  const v = this.elements?.data?.[k];
                  if (v !== undefined && v !== null && v !== '') { own[k] = v; }
                }
                this.edgeData = { ...response.data, ...own };
                this.shared_name = response.data.shared_name.replace('(pp)', '↠');
                this.sharedService.isSingleElementSelected = true;
                this.nodeType = false;

                this.sourceName = response.data.source_node.shared_name;
                this.targetName =  response.data.target_node.shared_name;
                this.sourceText = response.data.source_node.subgroup || response.data.source_node.diagnose_text;
                this.targetText = response.data.target_node.subgroup || response.data.target_node.diagnose_text;

                this.sourceChapter = response.data.source_node.chapter_description;
                this.targetChapter = response.data.target_node.chapter_description;

                this.edgeData.sourceColor = 'rgb(' + response.data.source_node.color + ')';
                this.edgeData.targetColor = 'rgb(' + response.data.target_node.color + ')';
              }
            },
            err => { this.loading = false;
              console.log(err);
            },
            () => {
            });
        if (this.numOfSelected == 0) {
          this.sharedService.areMultipleElementsSelected = false;
        } else {
          this.selectedArray.push(this.elements.data.shared_name);
        }
      } else {
        this.sharedService.areMultipleElementsSelected = true;
        this.numOfSelected = this.elements.length;
        //console.log(this.elements.length);
        // for (let element of this.elements) {
        //   console.log(element._private.data);
        // }
      }
    }
    if (changes['deselect']?.currentValue === true) {
      setTimeout(() => {
        this.sharedService.areMultipleElementsSelected = false;
        this.sharedService.isSingleElementSelected = false;
      }, 10);

      console.log('deselected');

      // One or more elements (nodes/edges) were selected
    }
  }
  public clearTabInfo(){
    this.sharedService.selectedElements = false;
    this.sharedService.areMultipleElementsSelected = false;
    this.numOfSelected = 0;
  }
}
