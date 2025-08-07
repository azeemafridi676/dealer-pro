import { Campaign } from './user.model';

export interface Lead {
    _id?: string;
    customer_id?: string;
    isRead?: boolean;
    priority?: number;
    status?: string;
    referror_platform?: string;
    logs?: string[];
    other_info?: { [key: string]: string };
    message_thread?: boolean;
    email_thread?: boolean;
    comments?: string[];
    assigned_to?: string;
    campaign_id?: string;
    is_deleted?: boolean;
    created_at?: Date;
    updated_at?: Date;
    customer_details?: CustomerDetails;
    campaign_details?: Campaign;
}

export interface CustomerDetails {
    _id?: string;
    customer_name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    dob?: Date;
    address?: string;
    other_info?: { [key: string]: string };
    campaign_ids?: string[];
    is_deleted?: boolean;
    created_at?: Date;
    updated_at?: Date;
}