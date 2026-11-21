import { Injectable } from '@angular/core';
import {SharedService} from "projects/shared/src/lib/shared.service";
@Injectable()
export class AnnotationService {

  constructor(public sharedService: SharedService){
  }


  public getCytoscapeLayout(): any {
    if (this.sharedService.networkToggleButtonOn) {
      // Directed graph layout object
      return {
        name: 'dagre',      // Set to Dagre
        nodeSep: 30,
        edgeSep: 10,
        rankSep: 1000,
        rankDir: 'LR',
        minLen: () => {
          return 10;
        },
        edgeWeight: () => {
          return 1;
        },
        animate: true,
        animateDuration: 300,
        directed: true,
        padding: 100
      };
    } else {
      // Preset layout object
      return {
        name: 'grid',    // Set to 'grid'
        animate: false,
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 1000,
        rankDir: 'LR',
        directed: true,
        //hideEdgesOnViewport: true,
        textureOnViewport: true,
        pixelRatio: 3.0,
        zoom: 0.9,
        padding: 50
      };

    }

  }

  // Create the JSON Styles for the nodes and edges
  public getCytoscapeStyles(nodeStyle:any, edgeStyle:any, nodeFontSize:any, edgeFontSize:any): Array<any>{
    // if(nodeFontSize == '' || edgeFontSize == ''){
    if(!nodeFontSize || !edgeFontSize ){
      if(this.sharedService.projectName == 'dtb'){
        nodeFontSize = '12';
        edgeFontSize = '16'
      }else{
        nodeFontSize = '10';
        edgeFontSize = '12'
      }
    }

    let completeStyleArray = this.getCoreStyle(); // First get the core style, ex. canvas background color
    console.log("choosing node style: ", nodeStyle);
    // Choose node styles
    switch(nodeStyle){
      
      case 'icd10':
        completeStyleArray = completeStyleArray.concat(this.getICD10AnnotationStyle(nodeFontSize));  // Get icd-10 style
        break;
      case 'text':
        completeStyleArray = completeStyleArray.concat(this.getTextAnnotationStyle(nodeFontSize));  // Get diagnose text style
        break;
      case 'codetext':
        completeStyleArray = completeStyleArray.concat(this.getCodeTextAnnotationStyle(nodeFontSize));  // Get diagnose text style
        break;
      case 'none':
        completeStyleArray = completeStyleArray.concat(this.getNodeNoneStyle(nodeFontSize));  // Get "none"-style
        break;
      default:
        completeStyleArray = completeStyleArray.concat(this.getCodeTextAnnotationStyle(nodeFontSize));  // Get default style if not defined
    }
    if (this.sharedService.projectName === 'srb') {
      completeStyleArray = completeStyleArray.concat(this.getNodeColors());  // srb: fixed chapter palette (do not change)
    } else {
      // Other browsers: chapter colour stored on each node in the data
      completeStyleArray = completeStyleArray.concat([{ selector: 'node[color]', style: { 'background-color': 'data(color)' } }]);
    }

    // Choose edge style
    switch(edgeStyle){
      case 'relativerisk':
        completeStyleArray = completeStyleArray.concat(this.getRelativeRiskStyle(edgeFontSize)); // Get relative risk style
        break;
      case 'patientnumber':
        completeStyleArray = completeStyleArray.concat(this.getPatientNumberStyle(edgeFontSize)); // Get patient number style
        break;
      case 'age':
        completeStyleArray = completeStyleArray.concat(this.getAgeStyle(edgeFontSize)); // Get age style
        break;
      case 'none':
        completeStyleArray = completeStyleArray.concat(this.getEdgeNoneStyle(edgeFontSize));  // Get "none"-style for edges
        break;
      default:
        completeStyleArray = completeStyleArray.concat(this.getPatientNumberStyle(edgeFontSize));   // If style-type not defined, return default
    }
    // Final polish: nicer arrows/labels + colour intensity. Widths from the tiers above are kept.
    completeStyleArray = completeStyleArray.concat(this.getEdgePolishStyle(edgeStyle));
    return completeStyleArray;
  }

  /**
   * Edge intensity in [0, 1] on a log scale: patient count (50,000 – 2.8M in the
   * data) or relative risk (1 – 62), matching what the edge width encodes.
   */
  private edgeIntensity(ele: any, edgeStyle: string): number {
    if (edgeStyle === 'relativerisk') {
      const rr = Math.max(1, Number(ele.data('relativerisk')) || 1);
      return Math.min(1, Math.log(rr) / Math.log(this.sharedService.cfg.max_relativerisk || 62));
    }
    // srb: every transition has >= 50,000 patients; browsers without a fixed baseline (ptb) start at 2,500
    let base = this.sharedService.cfg.patient_baseline ?? 50000;
    if (base <= 0) { base = 2500; }
    const pc = Math.max(base, Number(ele.data('patient_count')) || base);
    return Math.min(1, Math.log(pc / base) / Math.log(Math.max(base * 2, this.sharedService.cfg.max_number_patients || 2805860) / base));
  }

  /** Light sage -> deep green */
  private intensityColor(t: number): string {
    const from = [196, 204, 184], to = [35, 58, 27];
    const k = 0.15 + 0.85 * t;
    const c = from.map((f, i) => Math.round(f + (to[i] - f) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  private getEdgePolishStyle(edgeStyle: string): Array<any> {
    const graded = edgeStyle !== 'age' && edgeStyle !== 'none';
    const base: any = {
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      // arrow heads scale with edge width in Cytoscape; keep them proportionate on thick edges
      "arrow-scale": graded ? (ele: any) => 1.1 - 0.55 * this.edgeIntensity(ele, edgeStyle) : 0.9,
      "line-cap": "round",
      "source-distance-from-node": 2,
      "target-distance-from-node": 3,
      "opacity": 0.95,
      "text-background-shape": "roundrectangle",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.92,
      "text-background-padding": "3px",
      "text-border-width": 1,
      "text-border-color": "#d9ddca",
      "text-border-opacity": 1,
      "color": "#1d2a18",
    };
    if (graded) {
      base["line-color"] = (ele: any) => this.intensityColor(this.edgeIntensity(ele, edgeStyle));
      base["target-arrow-color"] = (ele: any) => this.intensityColor(this.edgeIntensity(ele, edgeStyle));
    }
    return [
      // Node labels under the node, wrapped, so long names never cover nodes or each other
      {
        selector: "node[full_name]",
        style: {
          "text-valign": "bottom",
          "text-halign": "center",
          "text-margin-y": 6,
          "text-wrap": "wrap",
          "text-max-width": "110px",
          "font-weight": "500",
          "color": "#1d2a18",
          "text-outline-width": 2,
          "text-outline-color": "#fcfcf8",
          "min-zoomed-font-size": 8,
        }
      },
      { selector: "edge", style: base },
      {
        selector: "edge:selected",
        style: {
          "line-color": "#c75b12",
          "target-arrow-color": "#c75b12",
          "text-border-color": "#c75b12",
          "opacity": 1,
          "z-index": 9999,
        }
      },
    ];
  }

  // Concatenate all disease nodes ids arrays with map-reduce
  private mapReduce(array:any) {
    return array
      .map(function (data:any) {
        return data;
      })
      .reduce((a:any, b:any) => a.concat(b));
  }

  private getCoreStyle(): Array<any>{
    return   [{
      "selector": "core",
      "style": {
        "active-bg-color": "#FFF",
        "active-bg-opacity": "1.0"
      }
    }];
  }

  private getRelativeRiskStyle(fontSize: string): Array<any>{
    return [{
      "selector": "edge",
      "style": {
        "font-family": "Roboto",
        "line-color": "#e5e5e5",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#e5e5e5",
        "label": "data(relativerisk)",
        "font-size": fontSize,
        "text-background-color": "#fafafa",
        "text-background-opacity": "1.0",
        "text-background-padding": "5px",
        "text-border-width": "1",
        "text-border-opacity": "1.0",
        "text-border-color": "#888",
        "min-zoomed-font-size": "12",
        "opacity": "1.0",
        "width": "5",
        "curve-style": "straight"
      }
    },
      {
        "selector": "edge[relativerisk > '1.'],"+
          "edge[relativerisk^='2.'],"+
          "edge[relativerisk^='3.'],"+
          "edge[relativerisk^='4.'],"+
          "edge[relativerisk^='5.']",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "opacity": "1.0",
          "min-zoomed-font-size": "12",
          "width": "4"
        }
      },
      {
        "selector": "edge[relativerisk > '6.'],"+
          "edge[relativerisk^='7.'],"+
          "edge[relativerisk^='8.'],"+
          "edge[relativerisk^='9.']",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "opacity": "1.0",
          "width": "7"
        }
      },
      {
        "selector": "edge[relativerisk > '10.'],"+
          "edge[relativerisk^='11.'],"+
          "edge[relativerisk^='12.'],"+
          "edge[relativerisk^='13.'],"+
          "edge[relativerisk^='14.']",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "opacity": "1.0",
          "width": "10"
        }
      },
      {
        "selector": "edge[relativerisk^='50.'],"+
          "edge[relativerisk^='51.'],"+
          "edge[relativerisk^='52.'],"+
          "edge[relativerisk^='53.'],"+
          "edge[relativerisk^='54.'],"+
          "edge[relativerisk^='55.']",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "opacity": "1.0",
          "width": "13"
        }
      },
      {
        "selector": "edge[relativerisk > '80.'],"+
          "edge[relativerisk^='81.'],"+
          "edge[relativerisk^='82.'],"+
          "edge[relativerisk^='83.'],"+
          "edge[relativerisk^='84.'],"+
          "edge[relativerisk^='85.']",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "opacity": "1.0",
          "width": "15"
        }
      },
      {
        "selector": "edge[relativerisk > '89.'],"+
          "edge[relativerisk^='87.'],"+
          "edge[relativerisk^='88.'],"+
          "edge[relativerisk^='89.'],"+
          "edge[relativerisk^='90.'],"+
          "edge[relativerisk^='100.']",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "opacity": "1.0",
          "width": "20"
        }
      },
      {
        "selector": "edge:selected",
        "style": {
          "line-color": "#ff5722",
          "target-arrow-color": "#ff5722",
          "target-arrow-shape": "triangle",
          "border-opacity": "1.0",
          "text-border-width": "1",
          "text-border-opacity": "1.0",
          "text-border-color": "#ff5722",
          "border-width": "5",
          "z-index": "9999"
        }
      }];
  }

  private getPatientNumberStyle(fontSize: string): Array<any>{
    return [{
      "selector": "edge",
      "style": {
        "font-family": "Roboto",
        "line-color": "#b9b9b9",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#b9b9b9",
        "label": "data(patient_count)",
        "font-size": fontSize,
        "text-background-color": "#ccd5ae",
        "text-background-opacity": "1.0",
        "text-background-padding": "5px",
        "text-border-width": "0",
        "text-border-opacity": "1.0",
        "text-border-color": "#000",
        "min-zoomed-font-size": "12",
        "width": "5",
        "curve-style": "straight",
      }
    },
      {
        "selector": "edge[patient_count > 100000]",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "target-arrow-shape": "triangle",
          "z-index": "9",
          "min-zoomed-font-size": "12",
          "width": "4"
        }
      },
      {
        "selector": "edge[patient_count > 200000]",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "target-arrow-shape": "triangle",
          "width": "7"
        }
      },
      {
        "selector": "edge[patient_count > 400000]",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-color": "#b9b9b9",
          "target-arrow-shape": "triangle",
          "width": "9"
        }
      },
      {
        "selector": "edge[patient_count > 750000]",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#b9b9b9",
          "width": "11"
        }
      },
      {
        "selector": "edge[patient_count > 1000000]",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#b9b9b9",
          "width": "15"
        }
      },
      {
        "selector": "edge[patient_count > 2000000]",
        "style": {
          "line-color": "#b9b9b9",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#b9b9b9",
          "width": "20"
        }
      },
      {
        "selector": "edge:selected",
        "style": {
          "line-color": "#ff5722",
          "target-arrow-color": "#ff5722",
          "target-arrow-shape": "triangle",
          "text-border-width": "1",
          "text-border-opacity": "1.0",
          "text-border-color": "#ff5722",
          "border-opacity": "1.0",
          "border-width": "5",
          "z-index": "9999"
        }
      }];
  }

  private getAgeStyle(fontSize: string): Array<any>{
    return [{
      "selector": "edge",
      "style": {
        "font-family": "Roboto",
        "line-color": "#e5e5e5",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#e5e5e5",
        "label": (ele: any) => {
          const years = ele.data('time_days_delta') / 365;
          // Format to 1 decimal place, and return as string
          return `${years.toFixed(1)}y`;
        },
        "font-size": fontSize,
        "text-background-color": "#ccd5ae",
        "text-background-opacity": "1.0",
        "text-background-padding": "5px",
        "text-border-width": "0",
        "text-border-opacity": "1.0",
        "text-border-color": "#000",
        "min-zoomed-font-size": "12",
        "opacity": "1.0",
        "width": "5",
        "curve-style": "straight",
      }
    }];
  }


  private getEdgeNoneStyle(fontSize: string): Array<any>{
    return [{
      "selector": "edge",
      "style": {
        "font-family": "Roboto",
        "line-color": "#000",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#000",
        "font-size": fontSize,
        "opacity": "1.0",
        "min-zoomed-font-size": "12",
        "width": "4",
        "curve-style": "straight"
      }
    },
      {
        "selector": "edge:selected",
        "style": {
          "line-color": "#ff5722",
          "target-arrow-color": "#ff5722",
          "target-arrow-shape": "triangle",
          "border-opacity": "1.0",
          "border-width": "5",
          "z-index": "9999"
        }
      }];
  }

  private getNodeNoneStyle(fontSize: string): Array<any>{
    return [{
      "selector": "node",
      "style": {
        "font-family": "Roboto",
        "width": "40",
        "height": "40",
        "opacity": "1.0",
        "font-size": fontSize, // default: 10
        "font-weight": "bold",
        "min-zoomed-font-size": "12",
        "text-valign": "center",
        "text-halign": "center",
        "color": "#000",
        "text-outline-width": "1",
        "text-outline-color": "#fff",
        "text-outline-opacity": "1.0",
        "overlay-color": "#fff",
        "border-color": "#ebebeb",
        "border-opacity": "1.0",
        "border-width": "3"
      }
    }];
  }

  private getNodeColors(): Array<any>{
    return [
      {
      "selector": "node[shared_name ^= '50']",
      "style": {
        "background-color": "#e4dfc3",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '01']",
      "style": {
        "background-color": "#19141f",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '03']",
      "style": {
        "background-color": "#ff9290",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '04']",
      "style": {
        "background-color": "#8f7abe",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '06']",
      "style": {
        "background-color": "#2582be",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '07']",
      "style": {
        "background-color": "#7b3887",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '08']",
      "style": {
        "background-color": "#35c0a7",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '09']",
      "style": {
        "background-color": "#d82327",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '11']",
      "style": {
        "background-color": "#ff9b50",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '15']",
      "style": {
        "background-color": "#c99e6f",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '17']",
      "style": {
        "background-color": "#b36872",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '18']",
      "style": {
        "background-color": "#19141f",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '20']",
      "style": {
        "background-color": "#75cd95",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '22']",
      "style": {
        "background-color": "#de768c",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '23']",
      "style": {
        "background-color": "#33835a",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '24']",
      "style": {
        "background-color": "#1a2f43",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '25']",
      "style": {
        "background-color": "#bcaf98",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '44']",
      "style": {
        "background-color": "#8f7abe",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '47']",
      "style": {
        "background-color": "#f1cce3",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '50']",
      "style": {
        "background-color": "#e4dfc3",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '51']",
      "style": {
        "background-color": "#bdb963",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '53']",
      "style": {
        "background-color": "#4a507c",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '54']",
      "style": {
        "background-color": "#b2351b",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '63']",
      "style": {
        "background-color": "#ec5529",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '80']",
      "style": {
        "background-color": "#57341f",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '81']",
      "style": {
        "background-color": "#789987",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '85']",
      "style": {
        "background-color": "#2c4622",
        "text-outline-color": "#FFF"
      }
    },
    {
      "selector": "node[shared_name ^= '96']",
      "style": {
        "background-color": "#929d9b",
        "text-outline-color": "#FFF"
      }
    },
      // {
      //   "selector": "node[shared_name ^= '03']," +
      //     "node[shared_name ^= 'D6']," +
      //     "node[shared_name ^= 'D7']," +
      //     "node[shared_name ^= 'D8']",
      //   "style": {

      //     "background-color": "rgb(246,158,220)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'E']",
      //   "style": {
      //     "background-color": "rgb(255,26,185)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'F']",
      //   "style": {
      //     "background-color": "rgb(45,201,45)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'G']",
      //   "style": {
      //     "background-color": "rgb(0,77,230)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'H0']," +
      //     "node[shared_name ^= 'H1']," +
      //     "node[shared_name ^= 'H2']," +
      //     "node[shared_name ^= 'H3']," +
      //     "node[shared_name ^= 'H4']," +
      //     "node[shared_name ^= 'H5']",
      //   "style": {
      //     "background-color": "rgb(255,193,132)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'H6']," +
      //     "node[shared_name ^= 'H7']," +
      //     "node[shared_name ^= 'H8']," +
      //     "node[shared_name ^= 'H9']",
      //   "style": {
      //     "background-color": "rgb(167,167,249)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'I']",
      //   "style": {
      //     "background-color": "rgb(160,12,196)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'J']",
      //   "style": {
      //     "background-color": "rgb(98,93,93)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'K']",
      //   "style": {
      //     "background-color": "rgb(0,132,149)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'L']",
      //   "style": {
      //     "background-color": "rgb(114,150,86)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'M']",
      //   "style": {
      //     "background-color": "rgb(150,8,102)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'N']",
      //   "style": {
      //     "background-color": "rgb(249,223,30)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'O']",
      //   "style": {
      //     "background-color": "rgb(23,206,149)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'P']",
      //   "style": {
      //     "background-color": "rgb(18,96,27)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'Q']",
      //   "style": {
      //     "background-color": "rgb(246,132,9)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'R']",
      //   "style": {
      //     "background-color": "rgb(0,0,123)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'S']," +
      //     "node[shared_name ^= 'T']",
      //   "style": {
      //     "background-color": "rgb(255,0,0)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'V']," +
      //     "node[shared_name ^= 'X']," +
      //     "node[shared_name ^= 'Y']",
      //   "style": {
      //     "background-color": "rgb(183,201,75)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'Z']",
      //   "style": {
      //     "background-color": "rgb(0,0,2)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      // {
      //   "selector": "node[shared_name ^= 'U']",
      //   "style": {
      //     "background-color": "rgb(255,255,255)",
      //     "text-outline-color": "#FFF"
      //   }
      // },
      {
        "selector": "node:selected",
        "style": {
          "width": "40",
          "height": "40",
          "border-color": "#ff5722",
          "border-opacity": "1.0",
          "border-width": "2.5"
        }
      }];
  }

  private getICD10AnnotationStyle(fontSize: string): Array<any>{
    return [{
      "selector": "node",
      "style": {
        "font-family": "Roboto",
        "width": "40",
        "height": "40",
        "opacity": "1.0",
        "font-size": fontSize, // default: 12
        "font-weight": "bold",
        "min-zoomed-font-size": "12",
        "label": "data(shared_name)",
        "text-valign": "center",
        "text-halign": "center",
        "color": "#000",
        "text-outline-width": "1",
        "text-outline-color": "#FFF",
        "text-outline-opacity": "1.0 !important",
        "overlay-color": "#FFF",
        "border-color": "#ebebeb",
        "border-opacity": "1.0 !important",
        "border-width": "3"
      }
    }];
  }

  private getTextAnnotationStyle(fontSize: string): Array<any>{
    return [{
      "selector": "node",
      "style": {
        "font-family": "Roboto",
        "width": "40",
        "height": "40",
        "opacity": "1.0",
        "font-size": fontSize,
        "font-weight": "bold",
        "min-zoomed-font-size": "12",
        "label": "data(diagnose_text)",
        "text-valign": "bottom",
        "text-halign": "center",
        "color": "#000",
        "text-outline-width": "1",
        "text-outline-color": "#FFF",
        "text-outline-opacity": "1.0 !important",
        "overlay-color": "#FFF",
        "border-color": "#ebebeb",
        "border-opacity": "1.0 !important",
        "border-width": "3",
        "text-background-shape": "roundrectangle",
        "text-margin-y": "5",
        "text-max-width": "100px",
        "text-background-opacity": "1",
        "text-background-color": "#ededed"
      }
    }];
  }

  private getCodeTextAnnotationStyle(fontSize: string): Array<any> {
  return [{
    selector: "node",
    style: {
      "font-family": "Roboto",
      "width": "40",
      "height": "40",
      "opacity": "1.0",
      "font-size": fontSize,
      "font-weight": "bold",
      "min-zoomed-font-size": "12",
      "label": (ele: any) => ele.data('full_name'),
      "text-valign": "center",
      "text-halign": "center",
      "color": "#000",
      "text-outline-width": "1",
      "text-outline-color": "#FFF",
      "border-color": "#ebebeb",
      "border-width": "3"
    }
  }];
  }
}
