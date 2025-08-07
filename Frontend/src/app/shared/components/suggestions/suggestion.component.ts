import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Tag } from '../../model/tag.model';

@Component({
  selector: 'app-suggestion',
  templateUrl: 'suggestion.component.html',
  styleUrls: ['suggestion.component.scss']
})
export class SuggestionComponent implements OnInit {
  @Input() suggestion: Tag | undefined;
  @Output() closed = new EventEmitter<Tag>();

  constructor() { }

  ngOnInit() { }

  onSuggestionClicked(suggestion: Tag | undefined) {
    this.closed.emit(suggestion);
  }
}