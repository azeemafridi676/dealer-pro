import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, from, map, Observable } from 'rxjs';
import { AuthService } from '../Auth/Auth.service';

@Injectable({
    providedIn: 'root'
})
export class CampaignService {
    private backendUrl = environment.BACKEND_URL;
    private CREATE_CAMPAIGN = `${this.backendUrl}/api/campaign/create-campaign`;
    private GET_CAMPAIGNS = `${this.backendUrl}/api/campaign/get-campaigns`;
    private GET_CAMPAIGNS_TO_REVIEW = `${this.backendUrl}/api/campaign/get-campaigns-to-review`;
    private DELETE_CAMPAIGN = `${this.backendUrl}/api/campaign/delete-campaign`;
    private APPROVE_CAMPAIGN = `${this.backendUrl}/api/campaign/approve-campaign`;
    private REJECT_CAMPAIGN = `${this.backendUrl}/api/campaign/reject-campaign`;
    private GET_CAMPAIGN_BY_ID = `${this.backendUrl}/api/campaign/get-campaign-by-id`;
    private GET_CAMPAIGN_DETAILS = `${this.backendUrl}/api/campaign/get-campaign-details`;
    private GENERATE_UPLOAD_URL = `${this.backendUrl}/api/campaign/generate-upload-url`;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { 
    }

    generateUploadUrl(file: File): Observable<{presignedUrl: string; finalS3Url: string}> {
        const payload = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        };
        console.log('Requesting presigned URL with payload:', payload);
        return this.http.post<any>(this.GENERATE_UPLOAD_URL, payload).pipe(
            map(response => {
                console.log('Received presigned URL response:', response);
                return response.data;
            })
        );
    }

    uploadFileToS3(presignedUrl: string, file: File, onProgress?: (percentage: number) => void): Observable<void> {
        console.log('Starting S3 upload with:', {
            presignedUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        });

        return new Observable(observer => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    const percentage = (event.loaded / event.total) * 100;
                    onProgress(percentage);
                    console.log(`Upload progress: ${percentage.toFixed(2)}%`);
                }
            };

            xhr.onload = () => {
                console.log('Upload response:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    response: xhr.responseText
                });

                if (xhr.status >= 200 && xhr.status < 300) {
                    observer.next();
                    observer.complete();
                } else {
                    const error = new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`);
                    console.error('Upload error details:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        response: xhr.responseText,
                        headers: xhr.getAllResponseHeaders()
                    });
                    observer.error(error);
                }
            };

            xhr.onerror = (error) => {
                console.error('Network error during upload:', error);
                observer.error(new Error('Upload failed: Network error'));
            };

            xhr.open('PUT', presignedUrl);
            console.log('Request headers:', xhr.getAllResponseHeaders());
            
            // Don't set Content-Type header - it's already in the presigned URL
            // Don't set ACL header - it's already in the presigned URL
            
            xhr.send(file);

            return () => {
                xhr.abort();
            };
        });
    }

    createCampaign(formData: FormData): Observable<any> {
        return this.http.post(this.CREATE_CAMPAIGN, formData);
    }

    getCampaigns(): Observable<any> {
        return this.http.get(this.GET_CAMPAIGNS);
    }

    getCampaignsToReview(filterStatus: string): Observable<any> {
        return this.http.get(this.GET_CAMPAIGNS_TO_REVIEW, { params: { filterStatus } });
    }

    deleteCampaign(campaignId: string): Observable<any> {
        return this.http.delete(`${this.DELETE_CAMPAIGN}/${campaignId}`);
    }

    approveCampaign(campaignId: string): Observable<any> {
        return this.http.put(`${this.APPROVE_CAMPAIGN}/${campaignId}`, {});
    }

    rejectCampaign(campaignId: string, reason: string): Observable<any> {
        return this.http.put(`${this.REJECT_CAMPAIGN}/${campaignId}`, { reason });
    }

    getCampaignById(campaignId: string): Observable<any> {
        return this.http.get(`${this.GET_CAMPAIGN_BY_ID}/${campaignId}`);
    }

    getCampaignDetails(campaignId: string): Observable<any> {
        return this.http.get(`${this.GET_CAMPAIGN_DETAILS}/${campaignId}`);
    }

    updateCampaign(id: string, formData: FormData): Observable<any> {
        return this.http.put(`${this.backendUrl}/api/campaign/update-campaign/${id}`, formData);
    }

    prepareCampaignFormData(campaignData: any, mediaUrl?: string): FormData {
        const formData = new FormData();
        formData.append('campaignName', campaignData.campaignName);
        formData.append('startDateTime', campaignData.startDateTime);
        formData.append('endDateTime', campaignData.endDateTime);
        formData.append('selectedLocations', JSON.stringify(campaignData.selectedLocations));
        formData.append('mediaType', campaignData.mediaType);
        formData.append('mediaDuration', campaignData.mediaDuration.toString());
        
        if (mediaUrl) {
            formData.append('mediaUrl', mediaUrl);
        }
        
        return formData;
    }
}
