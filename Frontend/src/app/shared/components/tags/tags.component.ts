import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { NgModel } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Tag } from '../../model/tag.model';
import { TagService } from '../../service/shared/tags.service';

@Component({
  selector: 'app-tags',
  templateUrl: 'tags.component.html',
  styleUrls: ['tags.component.scss'],
})
export class TagsComponent implements OnInit, OnDestroy {

  @Input() tags: Tag[] | undefined;
  @Input() suggestions: Tag[] | undefined;
  
  @Output() tagAdded = new EventEmitter<Tag>();
  @Output() tagRemoved = new EventEmitter<Tag>();
  
  @ViewChild('tagInput') tagInput: NgModel | undefined;

  expanded = true;
  tagInputText = '';

  debouncedText = '';

  private changesSub: Subscription | undefined;

  constructor(private tagService: TagService) { }

  ngOnInit() {
    this.changesSub = this?.tagInput?.valueChanges
      ?.pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(tagInputText => {
        this.debouncedText = tagInputText;
      });
  }

  ngOnDestroy() {
    if (this.changesSub) {
      this.changesSub.unsubscribe();
    }
  }

  onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        const filtered = this.tagService.filterSuggestions(this.suggestions || [], this.tags || [], this.debouncedText);
        if (filtered.length > 0) {
          this.tagAdded.emit(filtered[0]);
        }
      } else {
        this.tagAdded.emit({ name: this.tagInputText, backgroundColor: '#868E96', color: '#FFFFFF' });
        this.tagInput?.reset();
      }
    }
  }
  
  onAdd() {
    this.tagAdded.emit({ name: this.tagInputText, backgroundColor: '#868E96', color: '#FFFFFF' } as Tag);
    this.tagInput?.reset();
  }

  onExpand() {
    this.expanded = !this.expanded;
  }
}
