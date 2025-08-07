import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, from, map, Observable } from 'rxjs';
import { AuthService } from '../Auth/Auth.service';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private backendUrl = environment.BACKEND_URL;
    private GET_ALL_LOCATIONS = `${this.backendUrl}/api/location/get-all-locations`;
    private GET_STORES = `${this.backendUrl}/api/store/get-all-stores`;
    private GET_COUNTRIES = `${this.backendUrl}/api/location/countries`;
    private GET_STATES = `${this.backendUrl}/api/location/states`;
    private ADD_LOCATION = `${this.backendUrl}/api/location/add`;
    private UPDATE_LOCATION = `${this.backendUrl}/api/location/update`;
    private GET_AVAILABLE_STATES = `${this.backendUrl}/api/location/get-available-states`;
    private ADD_AVAILABLE_STATES = `${this.backendUrl}/api/location/add-available-states`;
    private DELETE_AVAILABLE_STATE = `${this.backendUrl}/api/location/delete-available-state`;
    private GET_LOCATIONS_WITH_CAMPAIGN_STATUS = `${this.backendUrl}/api/location/get-locations-with-campaign-status`;
    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { 
      this.geocoder = new google.maps.Geocoder();
    }
    private geocoder: google.maps.Geocoder;

    // Get all locations
    getLocations(): Observable<any> {
        return this.http.get<any>(this.GET_ALL_LOCATIONS);
    }

    // Get all stores
    getStores(): Observable<any> {
        return this.http.get<any>(this.GET_STORES);
    }

    // Get all countries
    getCountries(): Observable<any> {
        return this.http.get<any>(this.GET_COUNTRIES);
    }

    // Get states by country ID
    getStatesByCountry(countryId: string): Observable<any> {
        return this.http.get<any>(`${this.GET_STATES}/${countryId}`);
    }

    // Add new location
    addLocation(locationData: any) {
        return this.http.post(`${this.ADD_LOCATION}`, locationData);
    }

    // Update location coordinates
    updateLocationCoordinates(locationId: string, coordinates: {
        latitude: number,
        longitude: number
    }): Observable<any> {
        return this.http.patch<any>(`${this.backendUrl}/api/location/${locationId}/coordinates`, coordinates);
    }

    // Get location by ID
    getLocationById(locationId: string): Observable<any> {
        return this.http.get<any>(`${this.backendUrl}/api/location/get-by-id/${locationId}`);
    }

    // Delete location
    deleteLocation(locationId: string): Observable<any> {
        return this.http.delete<any>(`${this.backendUrl}/api/location/${locationId}`);
    }

    // Update location
    updateLocation(locationId: string, locationData: any): Observable<any> {
        return this.http.put<any>(`${this.UPDATE_LOCATION}/${locationId}`, locationData);
    }

    // Add state
    addState(stateData: any): Observable<any> {
        return this.http.post<any>(this.ADD_AVAILABLE_STATES, stateData);
    }

    // Get all states
    getStates(): Observable<any> {
        return this.http.get<any>(this.GET_AVAILABLE_STATES);
    }

    // Delete state
    deleteState(stateId: string): Observable<any> {
        return this.http.delete<any>(`${this.DELETE_AVAILABLE_STATE}/${stateId}`);
    }

    getStateBoundaries(stateCode: string): Promise<any> {
        return new Promise((resolve, reject) => {
            // Use the Maps JavaScript API's Data layer to load state boundaries
            fetch(`https://storage.googleapis.com/mapsdevsite/json/states.js`)
                .then(response => response.json())
                .then(data => {
                    // Find the state feature
                    const stateFeature = data.features.find((f: any) => 
                        f.properties.STATE_ABBR === stateCode
                    );
                    
                    if (!stateFeature) {
                        reject(new Error('State not found'));
                        return;
                    }

                    // Calculate viewport from geometry
                    const bounds = new google.maps.LatLngBounds();
                    const coordinates = stateFeature.geometry.coordinates[0];
                    coordinates.forEach((coord: number[]) => {
                        bounds.extend(new google.maps.LatLng(coord[1], coord[0]));
                    });

                    resolve({
                        boundary: stateFeature,
                        viewport: bounds
                    });
                })
                .catch(error => reject(error));
        });
    }

    // Get all locations with campaign status
    getLocationsWithCampaignStatus(): Observable<any> {
        return this.http.get<any>(this.GET_LOCATIONS_WITH_CAMPAIGN_STATUS);
    }
}
