export interface Role {
  role_id: string;
  corp_id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleResponse {
  success: boolean;
  message?: string;
  data: Role[];
} 