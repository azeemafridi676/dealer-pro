import { Injectable } from '@angular/core';
import { Tag } from '../../model/tag.model';
import * as matcher from '../../matcher';
@Injectable({
  providedIn: 'root'
})
export class TagService {

  filterSuggestions(suggestions: Tag[] | undefined, tags: Tag[] | undefined,  filter: string): Tag[] {
    const distinct = this.outersect(suggestions || [], tags || [], (t: Tag) => t.name);
    if (distinct && filter) {
      let searchTerm = filter || '*';
      searchTerm = searchTerm.endsWith('*') ? searchTerm : searchTerm + '*';
      searchTerm = searchTerm.startsWith('*') ? searchTerm : '*' + searchTerm;

      const filtered = distinct.filter(d => matcher.isMatch(d, searchTerm));
      return (suggestions || []).filter((s: Tag) => filtered.indexOf(s.name) !== -1);
    }
    return [];
  }

  private outersect<T, U>(a: T[], b: T[], mapFn: (value: T, index: number, array: T[]) => U): U[] {
    return a.map(mapFn).filter(value => b.map(mapFn).indexOf(value) === -1);
  }
}