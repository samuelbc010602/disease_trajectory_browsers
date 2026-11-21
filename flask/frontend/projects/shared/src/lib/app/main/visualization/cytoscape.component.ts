import {AfterViewInit, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {DataProviderService} from "projects/shared/src/lib/data-provider.service";
import {SharedService} from "projects/shared/src/lib/shared.service";
import {AnnotationService} from "projects/shared/src/lib/annotation.service";
import {ProgressbarComponent} from "projects/shared/src/lib/app/main/visualization/progressbar.component";
import {MatDialog} from "@angular/material/dialog";
declare let cytoscape: any;
declare let $: any;
import * as FileSaver from 'file-saver';
import * as json2csv from 'json2csv';
import {Options} from "json2csv";
import { Subscription } from 'rxjs';
@Component({
  selector: 'lib-cytoscape',
  template: '<div id="cy" [ngStyle]="{\'background-position\': sharedService.sideBarIsOpen ? \'bottom 20% right 18%\' : \'bottom 20% right 1%\' }"></div>',
  styleUrls: ['./cytoscape.component.css'],
  providers: [ ]
})
export class CytoscapeComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input() public elements: any; // [elements]
  @Input() public codes: any;
  @Input() public filterApplied: any;
  @Input() public networkBthToggled: any;
  @Input() public edgeStyle: any;
  @Input() public nodeStyle: any;
  @Input() public edgeFontSize: any;
  @Input() public nodeFontSize: any;
  @Input() public download:any;
  public dialogRef: any;
  public cy: any = null;
  public shared_name_mapper: { [key: string]: string } = {};
  private zoomSubscription!: Subscription;
  private edgeSelectionSubscription?: Subscription;
  private currentDataSub: Subscription | null = null;
  private prevFilters: any = null;
  private prevElements: any;
  private cancelSearch: boolean = false;
  constructor(public dialog: MatDialog, public dataProviderService: DataProviderService, public sharedService: SharedService, public annotationService: AnnotationService) {

  }

  ngOnInit(): void {

    // Toolbar zoom: a step (+/-) around the screen center, or 0 = fit & center
    this.zoomSubscription = this.sharedService.zoomLevel$.subscribe(step => {
      if (!this.cy) { return; }
      if (!step) { this.centerGraph(); return; }
      const factor = step > 0 ? 1.25 : 0.8;
      this.cy.zoom({
        level: this.cy.zoom() * factor,
        renderedPosition: { x: this.cy.width() / 2, y: this.cy.height() / 2 },
      });
    });

  this.edgeSelectionSubscription = this.sharedService.edgeSelection$.subscribe((direction) => {
      if (!this.cy) return;
      const selectedNodes = this.cy.nodes(':selected');
      const nonSelectedNodes = this.cy.nodes().not(':selected');

      const selectedEdges = this.cy.edges(':selected');
      const nonSelectedEdges = this.cy.edges().not(':selected');

      if (direction === 'incoming' || direction === 'outgoing') {
        selectedNodes.forEach((node: any) => {
          const nodeId = node.id();
          const edges = node.connectedEdges();

          if (direction === 'incoming') {
          edges.filter((edge: any) => edge.data('target') === nodeId).select();
          } else if (direction === 'outgoing') {
          edges.filter((edge: any) => edge.data('source') === nodeId).select();
          }
        })
      } else if (direction === 'inverse') {
        this.cy.batch(() => {
          selectedNodes.unselect();
          nonSelectedNodes.select();
          selectedEdges.unselect();
          nonSelectedEdges.select();
        });
      } else if (direction == 'trajectory'){
        // For each currently selected node, recursively select all upstream (incoming)
        // nodes/edges and all downstream (outgoing) nodes/edges until roots/leaves.
        try {
          const startNodes = this.cy.nodes(':selected');
          if (!startNodes || startNodes.length === 0) return;

          const visitedEdges = new Set<string>();

          // DOWNSTREAM: expand fully (select all descendants)
          const visitedDownNodes = new Set<string>();
          const downStack: string[] = [];
          startNodes.forEach((n: any) => downStack.push(n.id()));

          while (downStack.length > 0) {
            const nodeId = downStack.pop() as string;
            if (!nodeId || visitedDownNodes.has(nodeId)) continue;
            visitedDownNodes.add(nodeId);

            const nodeEl = this.cy.getElementById(nodeId);
            if (nodeEl && nodeEl.length) nodeEl.select();

            // follow outgoing edges -> children
            const outgoing = nodeEl.outgoers('edge');
            outgoing.forEach((edge: any) => {
              const eid = edge.id();
              if (!visitedEdges.has(eid)) {
                visitedEdges.add(eid);
                edge.select();
              }
              const tgt = edge.data('target');
              if (tgt && !visitedDownNodes.has(tgt)) downStack.push(tgt);
            });
          }

          // UPSTREAM: walk ancestors (select ancestor nodes and the connecting edges)
          // but do NOT expand ancestor children (no branching into siblings)
          const visitedUpNodes = new Set<string>();
          const upStack: string[] = [];
          startNodes.forEach((n: any) => upStack.push(n.id()));

          while (upStack.length > 0) {
            const nodeId = upStack.pop() as string;
            if (!nodeId || visitedUpNodes.has(nodeId)) continue;
            visitedUpNodes.add(nodeId);

            const nodeEl = this.cy.getElementById(nodeId);
            if (nodeEl && nodeEl.length) nodeEl.select();

            // only follow incoming edges to collect parents, but don't then follow
            // those parents' outgoing edges (so we don't select their other children)
            const incoming = nodeEl.incomers('edge');
            incoming.forEach((edge: any) => {
              const eid = edge.id();
              if (!visitedEdges.has(eid)) {
                visitedEdges.add(eid);
                edge.select();
              }
              const src = edge.data('source');
              if (src && !visitedUpNodes.has(src)) upStack.push(src);
            });
          }
        } catch (err) {
          console.error('Error during trajectory selection:', err);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    console.log('afterView()')
  }

  ngOnChanges(changes: SimpleChanges): void {
    let icd10 = this.codes;

    // Style-only changes (annotation / font size): restyle the existing graph
    // instead of re-querying the backend and re-running the layout.
    const queryChanged = !!(changes['codes'] || changes['filterApplied'] || changes['networkBthToggled']);
    const styleChanged = !!(changes['nodeStyle'] || changes['edgeStyle'] || changes['nodeFontSize'] || changes['edgeFontSize']);
    if (!queryChanged && styleChanged && this.cy) {
      this.cy.style(this.annotationService.getCytoscapeStyles(this.nodeStyle, this.edgeStyle, this.nodeFontSize, this.edgeFontSize));
    }

    if(queryChanged && icd10.length >= 1 && !changes['download']?.currentValue){
      // Drop any in-flight request so a slow, stale response can't overwrite a newer one
      if (this.currentDataSub) {
        this.currentDataSub.unsubscribe();
        this.currentDataSub = null;
        this.showProgressBar(false);
      }
      let params = this.sharedService.getLinearSearchParams();

      let findNodeMethod = false; // This should be used for the find node search
      // Save previous filters so we can restore if the user cancels
      this.prevFilters = {
        gender: this.sharedService.filtersGenderSelected,
        minTrajectoryLength: this.sharedService.minTrajectoryLength,
        maxTrajectoryLength: this.sharedService.maxTrajectoryLength,
        minRelativeRisk: this.sharedService.minRelativeRisk,
        maxRelativeRisk: this.sharedService.maxRelativeRisk,
        minNumPatients: this.sharedService.minNumPatients,
        maxNumPatients: this.sharedService.maxNumPatients,
        minChapters: this.sharedService.minChapters,
        maxChapters: this.sharedService.maxChapters,
        networked: this.sharedService.networkToggleButtonOn,
        pageIndex: this.sharedService.pageIndex,
        pageSize: this.sharedService.pageSize
      };

      this.showProgressBar(true);
      this.currentDataSub = this.dataProviderService.visualizationData$(params["networked"],'',params["rr"],params["np"],params["ll"],params["cc"],params["gender"],icd10,params["page_size"],params["page"]) 
        .subscribe({
          next: value => {
            // clear subscription handle on next (completed/handled)
            this.currentDataSub = null;
            if(!params["networked"]){
              // PUT THE FIND NODE LOGIC HERE
              this.sharedService.isLinearSearchOngoing = true;
              this.sharedService.isNetworkedSearchOngoing = false;
            }else{
              this.sharedService.isLinearSearchOngoing = false;
              this.sharedService.isNetworkedSearchOngoing = true;
            }
            if (value.elements.is_capped){
              this.sharedService.is_capped = value.elements.is_capped; 
            } 
            this.sharedService.distinctNodes = new Set(
              this.extractNodesFromElements(value.elements.nodes).map(n => [n.chapter,n.diagnose_text])
            );
            this.sharedService.graphCodes = new Set<string>(
              (value.elements.nodes || []).map((n: any) => String(n.data.shared_name))
            );
            this.sharedService.currentNumberTrajectories = value.num_trajectories;
            this.render(value.elements); // Render the Cytoscape.js canvas with the data
            this.showProgressBar(false);
          },
          error: err => {
            // clear subscription handle on error
            this.currentDataSub = null;
            this.showProgressBar(false);
            console.error(err);
          },
          complete: () => {

          }
        })
      }

    if(changes['download'] && changes['download'].currentValue){
      this.downloadVisualization(changes['download']?.currentValue)
    }

    if (this.cancelSearch){
      this.render(this.prevElements)
      this.cancelSearch = false;
    }

  }

ngOnDestroy(): void {
  if (this.zoomSubscription) {
    this.zoomSubscription.unsubscribe();
  }
  if (this.edgeSelectionSubscription) {
    this.edgeSelectionSubscription.unsubscribe();
  }
  if (this.currentDataSub) {
    this.currentDataSub.unsubscribe();
  }
  if (this.cy) {
    this.cy.destroy();
    this.cy = null;
  }
}

  public extractNodesFromElements(elements: any) {

  const setOfNodes = Object.values(elements).map((el: any) => ({
    shared_name: el.data.shared_name,
    full_name: el.data.full_name,
    diagnose_text: el.data.diagnose_text,
    fn: el.data.fn,
    data: { id: el.data.id },
    chapter: el.data.chapter
  }));

  return setOfNodes;
}

  public getSubtrajectories(elements: any) {
  console.log("📥 Received elements:", elements);

  if (!elements?.nodes?.length || !elements?.edges?.length) {
    console.warn("Empty or invalid elements");
    return { nodes: [], edges: [] };
  }

  // --- Map nodes by shared_name for easy lookup ---
  const nodesMap = new Map<string, any>();
  elements.nodes.forEach((n: any) => {
    if (n.data.shared_name) nodesMap.set(n.data.shared_name, n);
  });

  const newNodes: any[] = [];
  const newEdges: any[] = [];

  // Map to keep track of nodes already added per trajectory+gender
  const trajectoryNodeMap = new Map<string, Map<string, string>>(); // key = trajectory|gender -> shared_name -> nodeId

  // --- Group edges by trajectory AND gender ---
  const trajGroups = new Map<string, any[]>();
  for (const edge of elements.edges) {
    if (!edge.data.trajectory) continue;
    const gender = edge.data.gender_trajectories || "unknown";
    const key = `${edge.data.trajectory}|${gender}`;
    if (!trajGroups.has(key)) trajGroups.set(key, []);
    trajGroups.get(key)!.push(edge);
  }

  // --- Process each trajectory group ---
  for (const [key, edges] of trajGroups.entries()) {
    const [traj, gender] = key.split("|");
    const trajNodes = traj.split("_");

    if (!trajectoryNodeMap.has(key)) trajectoryNodeMap.set(key, new Map());
    const nodeIdMap = trajectoryNodeMap.get(key)!;

    // Build nodes and edges linearly
    for (let i = 0; i < trajNodes.length; i++) {
      const sharedName = trajNodes[i];
      const baseNode = nodesMap.get(sharedName);
      if (!baseNode) {
        console.warn(`⚠️ Node ${sharedName} not found for trajectory ${traj}`);
        continue;
      }

      // Determine unique node ID for this trajectory
      if (!nodeIdMap.has(sharedName)) {
        const nodeId = `${sharedName}_${gender}`;
        nodeIdMap.set(sharedName, nodeId);

        // Add node if not already added globally
        if (!newNodes.some(n => n.data.id === nodeId)) {
          newNodes.push({
            data: {
              ...baseNode.data,
              id: nodeId,
              originalId: sharedName,
              trajectory: traj,
              gender_trajectories: gender,
            },
          });
        }
      }

      // Add edge to next node
      if (i < trajNodes.length - 1) {
        const nextSharedName = trajNodes[i + 1];
        const nextNodeId = `${nextSharedName}_${gender}`;
        const sourceId = nodeIdMap.get(sharedName)!;

        // Find the original edge connecting this pair
        const originalEdge = edges.find(
          (e: any) =>
            (e.data.source === baseNode.data.id || e.data.source === sharedName) &&
            (e.data.target === nodesMap.get(nextSharedName)?.data.id || e.data.target === nextSharedName)
        );

        newEdges.push({
          data: {
            ...(originalEdge ? originalEdge.data : {}),
            id: `${sourceId}_${nextNodeId}_${traj}`,
            source: sourceId,
            target: nextNodeId,
            trajectory: traj,
            gender_trajectories: gender,
          },
        });
      }
    }
  }

  console.log("✅ Final nodes:", newNodes);
  console.log("✅ Final edges:", newEdges);

  return { nodes: newNodes, edges: newEdges };
  }


  public showProgressBar(show: boolean): void{
    // Open a dialog saying "loading..."
    if(show) {
      this.dialogRef = this.dialog.open(ProgressbarComponent, {
        width: '300px',
        disableClose: true,
        hasBackdrop: true,
        panelClass: 'custom-dialog-container'
      });
    }else{
      try { this.dialogRef.close(); } catch (e) { }
    }
  }

  private cancelWatcherInterval: any = null;

  public render(data_to_add: any) {
    // Free the previous graph (canvas, listeners, element index) before building a new one
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
    const numElements = (data_to_add?.nodes?.length || 0) + (data_to_add?.edges?.length || 0);
    const large = numElements > 1500;
    // Cytoscape Object
    this.cy = cytoscape({
      container: document.getElementById('cy'),
      // Rendering optimizations: cheaper panning/zooming on big graphs
      textureOnViewport: large,
      hideEdgesOnViewport: large,
      motionBlur: !large,
      pixelRatio: large ? 1 : 'auto',
      // elements: this.elements,
      layout: this.annotationService.getCytoscapeLayout(),
      style: this.annotationService.getCytoscapeStyles(this.nodeStyle,this.edgeStyle,this.nodeFontSize,this.edgeFontSize), //this.nodeStyle, this.edgeStyle, this.nodeFontSize, this.edgeFontSize
      minZoom: 0.15,
      maxZoom: 4.0,
      rankDir: 'LR',
      data: data_to_add
    });

    this.cy.add(data_to_add)
    this.cy.layout(
      {
        name: 'dagre',
        rankDir: 'LR',
        minZoom: 0.15,
        maxZoom: 4.0,
        minLen: () => {
          return 5;
        },
        style: [  // This is the key section
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'border-width': 0 // No border
            }
          },
        ]
      }).run()

    // Show the trajectories in the middle of the canvas
    this.centerGraph();

    this.cy.on('unselect', (cyObject:any)=>{
      this.sharedService.deselectedElement = true;
      this.sharedService.sideBarIsOpen = false;
    });

    // On selecting one or multiple nodes and/or edges
    this.cy.on('select', (cyObject:any) => {
      setTimeout(() => {
        this.sharedService.selectedSidebarTab = 2; // 2 = Information tab
      }, 10);

      this.sharedService.deselectedElement = false;
      this.sharedService.sideBarIsOpen = true;
      // Show in "Information"-tab...
      const selectednodes = cyObject.cy.nodes(':selected');
      const selectededges = cyObject.cy.edges(':selected');
      const allselected = new Array<any>();

      // // Identifying incoming/outgoing edges of a node
      // selectednodes.connectedEdges().forEach((edge: cytoscape.SingularElementReturnValue) => {
      //   const source = edge.data('source');
      //   const target = edge.data('target');
      //   const incomingEdges = []
      //   const outgoingEdges = []
      //   selectednodes.forEach((node: cytoscape.SingularElementReturnValue) => {
      //     const nodeId = node.id();

      //     if (source === nodeId) {
      //       outgoingEdges.push(edge.data)
      //     } else if (target === nodeId) {
      //     }
      //   });
      // });

      if (selectednodes.length + selectededges.length > 1) {
        // Multiselect
        for (const node of selectednodes) {
          allselected.push(node);
        }
        for (const edge of selectededges){
          allselected.push(edge);
        }
        this.sharedService.selectedElements = allselected;
      } else {
        // Select a single node or edge
        const element = cyObject.target._private;
        switch (element.group) {
          case 'edges':

            // Get all the text information from cytoscape nodes
            element.data.sourceText = cyObject.cy.$(element.data.source).data().full_name;
            element.data.targetText = cyObject.cy.$(element.data.target).data().full_name;
            element.data.sourceName = cyObject.cy.$(element.data.source).data().shared_name;
            element.data.targetName = cyObject.cy.$(element.data.target).data().shared_name;
            element.data.sourceColor = cyObject.cy.$(element.data.source).data().color;
            element.data.targetColor = cyObject.cy.$(element.data.target).data().color;
            this.sharedService.selectedElements = element;
            break;
          case 'nodes':
            element.aux = this.nodeContext(cyObject.target);
            this.sharedService.selectedElements = element;
            break;
          default:
            break;
        }
      }
    });

    this.prevElements = data_to_add;

  }

  /** Extra context for the details panel: the trajectory the node is in and its neighbours in the current view. */
  private nodeContext(node: any): any {
    const label = (n: any) => ({
      code: n.data('shared_name'),
      name: n.data('full_name') || n.data('diagnose_text') || n.data('shared_name'),
    });
    const neighbours = (edges: any, end: 'source' | 'target') => edges.map((e: any) => ({
      ...label(e[end]()),
      patients: Number(e.data('patient_count')) || null,
      rr: Number(e.data('relativerisk')) || null,
    })).sort((a: any, b: any) => (b.patients || 0) - (a.patients || 0)).slice(0, 5);

    const edges = node.connectedEdges();
    const trajectory: string = edges.length ? (edges[0].data('trajectory') || '') : '';
    const byCode = new Map<string, string>();
    this.cy.nodes().forEach((n: any) => {
      const d = n.data();
      if (d.shared_name && !byCode.has(d.shared_name)) { byCode.set(d.shared_name, d.full_name || d.diagnose_text || d.shared_name); }
    });
    const steps = trajectory ? trajectory.split('_').map((code: string) => ({ code, name: byCode.get(code) || code })) : [];
    return {
      sex: node.data('gender_trajectories') || node.data('gender') || '',
      before: neighbours(node.incomers('edge'), 'source'),
      after: neighbours(node.outgoers('edge'), 'target'),
      steps: this.sharedService.isNetworkedSearchOngoing ? [] : steps,
      trajectoriesInView: new Set(edges.map((e: any) => e.data('trajectory'))).size,
    };
  }

  /** Fit everything with some margin, but don't blow small graphs up; then center. */
  private centerGraph(): void {
    if (!this.cy || this.cy.elements().length === 0) { return; }
    this.cy.resize();
    this.cy.fit(undefined, 40);
    if (this.cy.zoom() > 1.3) {
      this.cy.zoom(1.3);
    }
    this.cy.center();
  }

  public downloadVisualization(type: string){

    switch (type) {
      case 'jpg':
        const jpgBlob = this.cy.jpg({output: 'blob', full: true, maxWidth: 6000, maxHeight: 20000});
        FileSaver.saveAs(new Blob([jpgBlob], {type: 'image/jpeg'}), 'dtb_visualization.jpg');
        console.log('Downloading jpeg.');
        this.showProgressBar(false);
        break;
      case 'png':
        const pngBlob = this.cy.png({output: 'blob', full: true, maxWidth: 6000, maxHeight: 20000});
        FileSaver.saveAs(new Blob([pngBlob], {type: 'image/png'}), 'dtb_visualization.png');
        console.log('Downloading png.');
        this.showProgressBar(false);
        break;
      case 'json':
        const cytoscapeJsonHead = '{"format_version" : "1.0","generated_by" : "cytoscape-3.5.1",' +
          '"target_cytoscapejs_version" : "~2.1","data" : {"__Annotations" : [ ],"selected" : true},';
        const json =  cytoscapeJsonHead + JSON.stringify(this.cy.json()).substring(1); // Remove the first character
        const blob = new Blob([json], {type: 'application/json;charset=utf-8'});
        FileSaver.saveAs(blob, 'dtb_visualization.cyjs');
        console.log('Downloading json.');
        this.showProgressBar(false);
        break;
      case 'csv':
        const nodeData: any[] = [];
        const edgeData: any[] = [];
        const nodesJson =  this.cy.nodes();
        nodesJson.forEach((node:any) => {
          nodeData.push(node.data());
        });
        const node_column_names = ['SUID', 'color', 'dead_after_5_years_count', 'diagnose_text', 'full_name',
          'gender_trajectories', 'id', 'linear_degree', 'patient_count', 'selected', 'shared_name', 'trajectory',
          'trajectory_length'];
        const nodes_filename = 'dtb_visualization_nodes.csv';
        const node_options: any = { node_column_names, output: nodes_filename };
        const nodes_csv = json2csv.parse(nodeData, node_options);
        const nodes_blob = new Blob([nodes_csv], {type: 'text/csv;charset=utf-8'});
        FileSaver.saveAs(nodes_blob, nodes_filename);
        console.log('Downloading nodes csv.');
        const edge_column_names = ['SUID', 'age_years', 'dead_after_5_years_count', 'gender_trajectories', 'id',
          'linear_degree', 'patient_count', 'pvalue', 'pvalue_dir', 'relativerisk', 'selected', 'shared_interaction',
          'shared_name', 'source', 'target', 'time_months', 'time_months_delta', 'trajectory', 'trajectory_length'];
        const edgesJson =  this.cy.edges();
        edgesJson.forEach((edge:any) => {
          edgeData.push(edge.data());
        });
        const edges_filename = 'dtb_visualization_edges.csv';
        const edge_options: any = { edge_column_names, output: edges_filename };
        const edges_csv = json2csv.parse(edgeData, edge_options);
        const edges_blob = new Blob([edges_csv], {type: 'text/csv;charset=utf-8'});
        setTimeout(() => {
          FileSaver.saveAs(edges_blob, edges_filename);
        }, 1000);
        console.log('Downloading edges csv.');
        this.showProgressBar(false);
        break;
      default:
    }


  }
}



