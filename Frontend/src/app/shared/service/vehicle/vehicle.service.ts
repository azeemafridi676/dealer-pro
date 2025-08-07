import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';

export interface VehicleDocument {
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  uploadedAt?: string | Date;
  source?: string;
  context?: string;
  agreementType?: string;
  contractNumber?: string;
}

export interface VehicleResponseItem {
  [key: string]: any;
  vehicle_id: string;
  registrationData: {
    registrationNumber: string;
  };
  media?: VehicleDocument[];
  documents?: VehicleDocument[];
}

export interface VehicleResponse {
  success: boolean;
  data: VehicleResponseItem[];
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
  stats?: {
    soldVehicles?: number;
    averageInventoryDays?: number;
  };
}

export interface Vehicle {
  status: {
    registrationType: string;
    date: string;
    leased: boolean;
    methodsOfUse: string[];
    code: 'STOCK' | 'SOLD' | 'CONSIGNMENT';
    insuranceType?: string;
  };
  // ... rest of the interface remains the same
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) { }

  /**
   * Get all vehicles (summary)
   * @param page The page number to fetch
   * @param limit The number of items per page
   * @param filters Optional filters for searching
   */
  getAllVehicles(page: number, limit: number, filters?: any): Observable<any> {
    console.log('Filters being applied:', filters);
    let params = `page=${page}&limit=${limit}`;
    if (filters) {
      const filterKeys = [
        'searchTerm', 'vehicleType', 'status', 'model', 'year', 
        'priceFrom', 'priceTo', 
        'mileageFrom', 'mileageTo', 
        'yearFrom', 'yearTo', 
        'lagerFrom', 'lagerTo', 
        'gearbox', 'drivmedel'
      ];

      filterKeys.forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params += `&${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`;
        }
      });
    }
    console.log('Final params:', params);
    return this.http.get(`${this.backendUrl}/api/vehicles?${params}`).pipe(
      map((response: any) => {
        console.log('Vehicle response:', response);
        // Transform documents to include agreement context
        if (response.data) {
          response.data = response.data.map((vehicle: any) => {
            const transformedDocuments = [
              ...(vehicle.media || []),
              ...(vehicle.documents || [])
            ].map((doc: any) => ({
              ...doc,
              source: doc.agreementType ? 'Agreement' : 'Vehicle',
              context: doc.agreementType ? `${doc.agreementType} Agreement (${doc.contractNumber})` : 'Vehicle Media'
            }));

            vehicle.documents = transformedDocuments;
            return vehicle;
          });
        }
        return response;
      })
    );
  }

  /**
   * Get a single vehicle by ID (full detail)
   * @param vehicleId The ID of the vehicle to get
   * @returns Observable with the vehicle data
   */
  getVehicleById(vehicleId: string): Observable<VehicleResponse> {
    return this.http.get<VehicleResponse>(`${this.backendUrl}/api/vehicles/${vehicleId}`);
  }

  /**
   */
  createVehicle(vehicleId: string): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/vehicles`, { vehicleId });
  }

  /**
   * Delete a vehicle by vehicleId
   */
  deleteVehicle(vehicleId: string): Observable<any> {
    return this.http.delete(`${this.backendUrl}/api/vehicles/${vehicleId}`);
  }

  /**
   * Search vehicle by registration number
   * @param registrationNumber The registration number to search
   * @returns Observable with the vehicle data
   */
  searchVehicleByRegistration(registrationNumber: string): Observable<any> {
    return this.http.get(`${this.backendUrl}/api/vehicles/search?registrationNumber=${registrationNumber}`);
  }

  /**
   * Get vehicles for trade-in (only vehicle_id and vehicleModel)
   */
  getTradeInVehicles(): Observable<any> {
    return this.http.get(`${this.backendUrl}/api/vehicles/trade-in-options`);
  }

  /**
   * Upload a document for a specific vehicle
   * @param vehicleId The ID of the vehicle
   * @param documentData FormData containing the document file
   * @returns Observable with the upload response
   */
  uploadVehicleDocument(vehicleId: string, documentData: FormData): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/vehicles/${vehicleId}/upload-document`, documentData).pipe(
      map((response: any) => {
        // Transform the document to match existing format
        if (response.media) {
          response.media = response.media.map((doc: any) => ({
            ...doc,
            source: 'Vehicle',
            context: 'Vehicle Media',
            uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date()
          }));
        }
        return response;
      })
    );
  }

  /**
   * Upload a note for a specific vehicle
   * @param vehicleId The ID of the vehicle
   * @param noteData Object containing note details
   * @returns Observable with the upload response
   */
  uploadVehicleNote(vehicleId: string, noteData: {
    content: string, 
    title?: string, 
    isPrivate?: boolean
  }): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/vehicles/${vehicleId}/upload-note`, noteData).pipe(
      map((response: any) => {
        // Transform the note to match existing format
        if (response.note) {
          response.note = {
            ...response.note,
            source: 'Vehicle',
            context: 'Vehicle Note',
            uploadedAt: response.note.uploadedAt ? new Date(response.note.uploadedAt) : new Date()
          };
        }
        return response;
      })
    );
  }

  /**
   * Add a new outlay for a specific vehicle
   * @param vehicleId The ID of the vehicle
   * @param outlayData The data for the outlay
   * @returns Observable with the response
   */
  addOutlay(vehicleId: string, outlayData: any): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/vehicles/${vehicleId}/outlay`, outlayData);
  }

  /**
   * Update an existing outlay for a specific vehicle
   * @param vehicleId The ID of the vehicle
   * @param outlayId The ID of the outlay to update
   * @param outlayData The updated data for the outlay
   * @returns Observable with the response
   */
  updateOutlay(vehicleId: string, outlayId: string, outlayData: any): Observable<any> {
    return this.http.put(`${this.backendUrl}/api/vehicles/${vehicleId}/outlay/${outlayId}`, outlayData);
  }

  /**
   * Delete an outlay for a specific vehicle
   * @param vehicleId The ID of the vehicle
   * @param outlayId The ID of the outlay to delete
   * @returns Observable with the response
   */
  deleteOutlay(vehicleId: string, outlayId: string): Observable<any> {
    return this.http.delete(`${this.backendUrl}/api/vehicles/${vehicleId}/outlay/${outlayId}`);
  }

  updateVehicleNote(vehicleId: string, noteId: string, noteData: any): Observable<any> {
    return this.http.put(`${this.backendUrl}/api/vehicles/${vehicleId}/note/${noteId}`, noteData);
  }

  deleteVehicleNote(vehicleId: string, noteId: string): Observable<any> {
    return this.http.delete(`${this.backendUrl}/api/vehicles/${vehicleId}/note/${noteId}`);
  }
}
