import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import * as product from '../../../shared/data/components/e-commerce/product';
import { Products } from '../../../shared/model/product.model';
@Injectable({
  providedIn: 'root',
})
export class ProductboxService {
  listData: Products[] | undefined;
  productData = product.productData;

  constructor(private http: HttpClient) {}

  products(): Observable<any> {
    return this.http.get('assets/data/product.json');
  }

  public getProduct(id: number): Observable<Products> {
    return this.products().pipe(
      map((items) => {
        return items.find((item: Products) => {
          return item.id === id;
        });
      })
    );
  }
}
