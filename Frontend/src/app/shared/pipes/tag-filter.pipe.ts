import { Pipe, PipeTransform } from '@angular/core';
import { TagService } from '../service/shared/tags.service';
import { Tag } from '../model/tag.model';

@Pipe({
  name: 'tagFilter'
})
export class TagFilterPipe implements PipeTransform {

  constructor(private tagService: TagService) { }

  transform(suggestions: Tag[] | undefined, tags: Tag[] | undefined,  filter: string): any {
    return this.tagService.filterSuggestions(suggestions, tags, filter);
  }
}