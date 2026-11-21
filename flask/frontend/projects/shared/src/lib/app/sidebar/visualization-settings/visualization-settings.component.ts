import { Component, OnInit } from '@angular/core';
import {UntypedFormControl} from "@angular/forms";
import {SharedService} from "projects/shared/src/lib/shared.service";

@Component({
  selector: 'lib-visualization-settings',
  templateUrl: './visualization-settings.component.html',
  styleUrls: ['./visualization-settings.component.css']
})
export class VisualizationSettingsComponent implements OnInit {

  constructor(public sharedService: SharedService) { }

  ngOnInit(): void {
  }

  // Data for the 'Node Annotation' select
  nodeAnnotations = [
    {value: 'icd10', viewValue: 'Trajectory code'},
    {value: 'codetext', viewValue: 'Trajectory description'},
    {value: 'none', viewValue: 'None'}
  ];
  // Set the first item as the default selected item
  nodeSelectControl = new UntypedFormControl('codetext');

  // Data for the 'Edge Annotation' select
  edgeAnnotations = [
    {value: 'patientnumber', viewValue: 'Number of patients'},
    {value: 'relativerisk', viewValue: 'Relative risk'},
    {value: 'age', viewValue: 'Average time difference (years)'},
    {value: 'none', viewValue: 'None'}
  ];
  // Set the first item as the default selected item
  edgeSelectControl = new UntypedFormControl('patientnumber');

  nodeFontSizes = [
    {value: '6', viewValue: '6'},
    {value: '8', viewValue: '8'},
    {value: '10', viewValue: '10'},
    {value: '12', viewValue: '12'},
    // {value: '16', viewValue: '16'},
    // {value: '18', viewValue: '18'},
    // {value: '20', viewValue: '20'},
    // {value: '24', viewValue: '24'},
    // {value: '28', viewValue: '28'},
    // {value: '32', viewValue: '32'},
    // {value: '38', viewValue: '38'}
  ];
  nodeFontSizeSelectControl = new UntypedFormControl('8');

  edgeFontSizes = [
    {value: '10', viewValue: '10'},
    {value: '12', viewValue: '12'},
    {value: '14', viewValue: '14'},
    {value: '16', viewValue: '16'},
    {value: '18', viewValue: '18'},
    {value: '20', viewValue: '20'},
    {value: '24', viewValue: '24'},
    {value: '28', viewValue: '28'},
    {value: '32', viewValue: '32'},
    {value: '38', viewValue: '38'}
  ];
  edgeFontSizeSelectControl = new UntypedFormControl('14');

  private _filterNodes(value: string) {
    const filterValue = value.toLowerCase();
    //return this.sharedService._cytoscapeSearchObjects.filter(data => data.full_name.toLowerCase().indexOf(filterValue) === 0);
  }
}
