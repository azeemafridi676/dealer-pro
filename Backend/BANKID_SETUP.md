# BankID Integration Setup Guide

This guide explains how to set up BankID signing functionality in the cardesk application.

## Environment Variables

Add the following environment variables to your `.env` file:

### Test Environment (Default)
```env
# BankID Test Configuration
BANKID_TEST_API_USER=your_test_api_user
BANKID_TEST_PASSWORD=your_test_password
BANKID_TEST_COMPANY_API_GUID=your_test_company_guid
BANKID_TEST_SIGN_URL=https://banksign-test.azurewebsites.net/api/sign
BANKID_TEST_COLLECT_URL=https://banksign-test.azurewebsites.net/api/collectstatus
```

### Production Environment
```env
# BankID Live Configuration (Only for production)
BANKID_LIVE_API_USER=your_live_api_user
BANKID_LIVE_PASSWORD=your_live_password
BANKID_LIVE_COMPANY_API_GUID=your_live_company_guid
BANKID_LIVE_SIGN_URL=your_live_sign_url
BANKID_LIVE_COLLECT_URL=your_live_collect_url
```

## BankID Test Setup

### 1. Download BankID Test App
- Download "BankID säkerhetsapp" on a test mobile or iPad
- **Important**: Do NOT use your regular phone for testing

### 2. Configure Test App
- Follow the instructions at: https://developers.bankid.com/test-portal/bankid-for-test
- Configure the BankID test app according to the guidelines

### 3. Create Test User
1. Go to https://demo.bankid.com
2. Click "Log in" and log in with your regular BankID or personal code
3. Click "Mobile BankID" under "Issue BankID for test"
4. Create a test user and scan the QR code with your test BankID app

## API Endpoints

The BankID integration uses two main endpoints:

### 1. Sign/Auth Endpoint
- **URL**: `https://banksign-test.azurewebsites.net/api/sign`
- **Method**: POST
- **Purpose**: Initiate authentication or signing process

### 2. Collect Status Endpoint
- **URL**: `https://banksign-test.azurewebsites.net/api/collectstatus`
- **Method**: POST
- **Purpose**: Check the status of ongoing signing process

## Features Implemented

### Frontend Features
1. **Terms Validation**: Users must accept terms and conditions before signing
2. **QR Code Display**: Shows dynamic QR code that refreshes every 5 seconds
3. **Manual Link Opening**: Button to open BankID app instead of automatic redirection
4. **Status Monitoring**: Real-time status updates during signing process
5. **Error Handling**: Comprehensive error messages and user guidance

### Backend Features
1. **Environment Configuration**: Supports both test and production environments
2. **Error Handling**: Proper error responses with detailed logging
3. **Request Validation**: Validates required parameters
4. **Timeout Management**: Configurable timeouts for API requests

## Usage Flow

1. User navigates to sign agreement page
2. Agreement details are loaded and displayed
3. User must accept terms and conditions
4. User clicks "Sign with BankID" button
5. System initiates BankID signing process
6. User can either:
   - Click "Open BankID App" button
   - Scan the displayed QR code
7. User completes signing in BankID app
8. System polls for status updates
9. Success/failure message is displayed
10. User is redirected back to agreements list

## Status Codes and Messages

### Pending States
- `outstandingTransaction`: Waiting for BankID app to complete signing
- `noClient`: Waiting for BankID app to start
- `started`: BankID app has started
- `userSign`: User needs to sign in BankID app

### Failed States
- `expiredTransaction`: Signing request expired
- `certificateErr`: Certificate error occurred
- `userCancel`: User cancelled the process
- `cancelled`: Process was cancelled
- `startFailed`: Failed to start BankID

## Security Notes

1. **Test vs Production**: Always use test environment for development
2. **Credentials**: Never commit real credentials to version control
3. **HTTPS**: Always use HTTPS in production
4. **IP Address**: User's real IP address is collected for security
5. **Encryption**: All signatures are encrypted according to Swedish standards

## Troubleshooting

### Common Issues
1. **Invalid Credentials**: Check environment variables
2. **Network Errors**: Verify internet connection and firewall settings
3. **QR Code Not Loading**: Check if image URL is accessible
4. **App Not Opening**: Ensure BankID app is installed on test device

### Debug Logging
The backend logs all BankID requests and responses (passwords are hidden) for debugging purposes.

## Testing

To test the integration:

1. Ensure test environment variables are set
2. Navigate to any agreement signing page
3. Accept terms and conditions
4. Click "Sign with BankID"
5. Use your test BankID app to complete the process

## Contact

For BankID API credentials and support, contact BankSignering support team. 