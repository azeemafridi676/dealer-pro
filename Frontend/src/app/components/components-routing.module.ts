import { NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';
var routingAnimation = localStorage.getItem('animate');
import { AuthGuard } from '../shared/guard/auth.guard';
import { RoleGuard } from '../shared/guard/role.guard';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { ProfileComponent } from './profile/profile.component';
import { RolesComponent } from './settings/roles/roles.component';
import { UsersComponent } from './users/users.component';
import { CorporationComponent } from './corporation/corporation.component';
import { WarehouseComponent } from './vehicles/warehouse/warehouse.component';
import { SoldComponent } from './vehicles/sold/sold.component';
import { ValuationComponent } from './vehicles/valuation/valuation.component';
import { SalesAgreementComponent } from './agreement/sales-agreement/sales-agreement.component';
import { PurchaseAgreementComponent } from './agreement/purchase-agreement/purchase-agreement.component';
import { AgencyAgreementComponent } from './agreement/agency-agreement/agency-agreement.component';
import { ReceiptComponent } from './agreement/receipt/receipt.component';
import { AgreementComponent } from './agreement/agreement.component';
import { CustomerComponent } from './customer/customer.component';
import { SwishComponent } from './swish/swish.component';
import { SwishAddComponent } from './swish/swish-add/swish-add.component';
import { InvoiceComponent } from './invoice/invoice.component';
import { AddInvoiceComponent } from './invoice/add-invoice/add-invoice.component';

const routes: Routes = [
  {
    path: '',
    canActivate:[AuthGuard],
    // resolve:{Permissions:PermissionsResolver},
    children: [
      {
        path: '',
        component: AdminDashboardComponent,
      
      },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      {
        path: 'roles',
        component: RolesComponent,
      },
      {
        path: 'users',
        component: UsersComponent,
      },
      {
        path: 'corporations',
        component: CorporationComponent,
      },
      {
        path: 'customers',
        component: CustomerComponent,
      },
      {
        path: 'vehicles',
        children: [
          {
            path: '',
            component: WarehouseComponent
          },
          {
            path: 'warehouse',
            component: WarehouseComponent,
          },
          {
            path: 'sold',
            component: SoldComponent,
          },
          {
            path: 'valuation',
            component: ValuationComponent,
          }
        ]
      },
      {
        path: 'agreements',
        children: [
          {
            path: '',
            component: AgreementComponent
          },
          {
            path: 'sales',
            component: SalesAgreementComponent
          },
          {
            path: 'purchase',
            component: PurchaseAgreementComponent
          },
          {
            path: 'agency',
            component: AgencyAgreementComponent
          },
          {
            path: 'receipt',
            component: ReceiptComponent
          }
        ]
      },
      {
        path: 'swish',
        children: [
          {
            path: '',
            component: SwishComponent,
          },
          {
            path: 'add',
            component: SwishAddComponent,
          }
        ]
      },
      {
        path: 'invoices',
        children: [
          {
            path: '',
            component: InvoiceComponent,
          },
          {
            path: 'add',
            component: AddInvoiceComponent
          }
        ]
      },
      {
        path: 'sales-agreement/edit/:id',
        component: SalesAgreementComponent,
        canActivate: [AuthGuard],
        data: { 
          title: 'Edit Sales Agreement',
          breadcrumb: 'Edit Sales Agreement'
        }
      },
      {
        path: 'purchase-agreement/edit/:id',
        component: PurchaseAgreementComponent,
        canActivate: [AuthGuard],
        data: { 
          title: 'Edit Purchase Agreement',
          breadcrumb: 'Edit Purchase Agreement'
        }
      },
      {
        path: 'agency-agreement/edit/:id',
        component: AgencyAgreementComponent,
        canActivate: [AuthGuard],
        data: { 
          title: 'Edit Agency Agreement',
          breadcrumb: 'Edit Agency Agreement'
        }
      }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComponentsRoutingModule {}
