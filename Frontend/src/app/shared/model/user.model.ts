// user.model.ts
export interface SignUpData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignUpResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  otp?: string;
  data?: {
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface OtpVerificationData {
  verificationId: string;
  otp: number;
}
