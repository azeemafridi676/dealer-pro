import { Component, Input } from '@angular/core';
import * as feather from 'feather-icons';
@Component({
  selector: 'app-feather-icon',
  templateUrl: './feather-icon.component.html',
  styleUrls: ['./feather-icon.component.scss']
})
export class FeatherIconComponent {
  
  @Input('icon') public icon: any;
  constructor() { }

  ngOnInit(): void {
    setTimeout(()=>{
      feather.replace()
    })
  }

}
