import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from '@angular/router';
import { SignAgreementService } from 'src/app/shared/service/sign-agreement/sign-agreement.service';
import { AgreementService } from 'src/app/shared/service/agreement/agreement.service';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

interface BankIDHintCode {
  code: string;
  message: string;
}

@Component({
  selector: "app-sign-agreement",
  templateUrl: "./sign-agreement.component.html",
})
export class SignAgreementComponent implements OnInit, OnDestroy {
  showPreview = false;
  agreementId: string | null = null;
  agreementData: any = null;
  pdfUrl: string | null = null;
  loading = true;
  
  // Terms and conditions acceptance
  termsAccepted = false;
  gdprAccepted = false;
  
  // BankID signing properties
  signing = false;
  signStatus: string | null = null;
  signError: string | null = null;
  orderRef: string | null = null;
  autoStartToken: string | null = null;
  qrImage: string | null = null;
  qrImageWithTimestamp: string | null = null;
  pollSub: Subscription | null = null;
  qrRefreshSub: Subscription | null = null;
  
  // Status messages
  statusMessage: string = '';
  hintMessage: string = '';
  showQrCode = false;
  showBankIDLink = false;
  bankIDLink: string = '';
  
  // User details from completed signing
  signedUserData: any = null;
  
  previewData = {
    contractDate: '',
    buyerName: '',
    buyerTelephone: '',
    buyerEmail: '',
    buyerAddress: '',
    buyerType: '',
    buyerSocialSecurityNumber: '',
    vehicleNotes: '',
    vehicleModel: '',
    vehicleRegistrationNumber: '',
    vatType: '',
    mileage: '',
    numberOfKeys: '',
    deck: '',
    insurer: '',
    insuranceType: '',
    warrantyProvider: '',
    warrantyProduct: '',
    tradeInVehicle: '',
    basePrice: '',
    paymentMethod: '',
    vehicleInformation: '',
  };

  private readonly hintCodes: { [key: string]: BankIDHintCode } = {
    // Pending states
    'outstandingTransaction': {
      code: 'outstandingTransaction',
      message: 'Waiting for you to open BankID app and complete the signing.'
    },
    'noClient': {
      code: 'noClient',
      message: 'Waiting for BankID app to start. Please open the app or scan the QR code.'
    },
    'started': {
      code: 'started',
      message: 'BankID app has started. Please complete the signing process.'
    },
    'userSign': {
      code: 'userSign',
      message: 'Please sign in the BankID app to complete the process.'
    },
    // Failed states
    'expiredTransaction': {
      code: 'expiredTransaction',
      message: 'The signing request has expired. Please try again.'
    },
    'certificateErr': {
      code: 'certificateErr',
      message: 'Certificate error occurred. Please try again.'
    },
    'userCancel': {
      code: 'userCancel',
      message: 'You cancelled the signing process.'
    },
    'cancelled': {
      code: 'cancelled',
      message: 'The signing process was cancelled.'
    },
    'startFailed': {
      code: 'startFailed',
      message: 'Failed to start BankID. Please ensure you have BankID app installed.'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private signService: SignAgreementService,
    private agreementService: AgreementService,
    private toastr: ToastrService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.agreementId = this.route.snapshot.paramMap.get('id');
    if (this.agreementId) {
      this.fetchAgreementDetails();
    } else {
      this.router.navigate(['/dashboard/agreements']);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.stopQrRefresh();
  }

  fetchAgreementDetails() {
    if (!this.agreementId) return;
    
    this.loading = true;
    this.agreementService.getAgreementDetailsPublic(this.agreementId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.agreementData = response.data;
          this.pdfUrl = response.data.pdfUrl;
          this.updatePreviewData();
        } else {
          this.toastr.error('Failed to load agreement details');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching agreement details:', error);
        this.toastr.error('Failed to load agreement details');
      }
    });
  }

  updatePreviewData() {
    if (!this.agreementData) return;
    
    // Update preview data based on agreement data
    this.previewData = {
      contractDate: this.agreementData.contractDate || this.agreementData.receiptDate || '',
      buyerName: this.agreementData.buyerName || this.agreementData.customerName || '',
      buyerTelephone: this.agreementData.buyerTelephone || this.agreementData.customerTelephone || this.agreementData.telephoneNumber || '',
      buyerEmail: this.agreementData.buyerEmail || this.agreementData.customerEmail || this.agreementData.emailAddress || '',
      buyerAddress: this.agreementData.buyerAddress || this.agreementData.customerAddress || '',
      buyerType: this.agreementData.buyerType || this.agreementData.customerType || '',
      buyerSocialSecurityNumber: this.agreementData.buyerSocialSecurityNumber || this.agreementData.customerSocialSecurityNumber || '',
      vehicleNotes: this.agreementData.vehicleNotes || '',
      vehicleModel: this.agreementData.vehicleModel || '',
      vehicleRegistrationNumber: this.agreementData.vehicleRegistrationNumber || this.agreementData.registrationNumber || '',
      vatType: this.agreementData.vatStatus || '',
      mileage: this.agreementData.mileage || '',
      numberOfKeys: this.agreementData.numberOfKeys || '',
      deck: this.agreementData.deck || '',
      insurer: this.agreementData.insurer || '',
      insuranceType: this.agreementData.insuranceType || '',
      warrantyProvider: this.agreementData.warrantyProvider || '',
      warrantyProduct: this.agreementData.warrantyProduct || '',
      tradeInVehicle: this.agreementData.tradeInVehicle || '',
      basePrice: this.agreementData.basePrice || this.agreementData.subtotal || '',
      paymentMethod: this.agreementData.paymentMethod || '',
      vehicleInformation: this.agreementData.vehicleInformation || ''
    };
  }

  showPreviewForm() {
    this.showPreview = true;
  }

  closePreviewForm() {
    this.showPreview = false;
  }

  openPDFPreview() {
    if (this.pdfUrl) {
      window.open(this.pdfUrl, '_blank');
    } else {
      this.toastr.error('PDF not available');
    }
  }

  downloadPDF() {
    if (this.pdfUrl) {
      const link = document.createElement('a');
      link.href = this.pdfUrl;
      link.download = `agreement-${this.agreementId}.pdf`;
      link.click();
    } else {
      this.toastr.error('PDF not available for download');
    }
  }

  // Validate terms acceptance before allowing signing
  canSign(): boolean {
    return this.termsAccepted && this.gdprAccepted && !this.signing;
  }

  onTermsChange(event: any) {
    this.termsAccepted = event.target.checked;
  }

  onGdprChange(event: any) {
    this.gdprAccepted = event.target.checked;
  }

  async getUserIp(): Promise<string> {
    try {
      const response = await this.http.get<any>('https://api.ipify.org?format=json').toPromise();
      return response?.ip || '127.0.0.1';
    } catch (error) {
      console.warn('Could not get user IP, using default');
      return '127.0.0.1';
    }
  }

  async signWithBankID() {
    // Validate terms acceptance
    if (!this.canSign()) {
      this.toastr.error('Please accept both the terms and conditions and GDPR consent before signing');
      return;
    }

    this.signing = true;
    this.signError = null;
    this.signStatus = null;
    this.statusMessage = 'Initiating BankID signing...';
    this.hintMessage = '';
    this.showQrCode = false;
    this.showBankIDLink = false;
    
    this.toastr.info('Initiating BankID signing...', 'BankID');

    try {
      const ip = await this.getUserIp();
      const userVisibleData = this.generateSigningText();
      
      this.signService.signWithBankID(ip, userVisibleData, '', 'test').subscribe({
        next: (res) => {
          if (res?.authResponse?.Success && res?.apiCallResponse?.Success) {
            this.orderRef = res.apiCallResponse.Response.OrderRef;
            this.autoStartToken = res.apiCallResponse.Response.AutoStartToken;
            this.qrImage = res.apiCallResponse.Response.QrImage;
            
            this.statusMessage = 'BankID signing initiated successfully';
            this.hintMessage = 'You can either click the button to open BankID app or scan the QR code';
            this.showQrCode = true;
            this.showBankIDLink = true;
            
            // Generate BankID link
            this.generateBankIDLink();
            
            // Start polling for status
            this.pollSignStatus();
            
            // Start QR code refresh
            this.startQrRefresh();
            
            this.toastr.success('BankID signing initiated. Please complete the process in your BankID app.', 'BankID');
          } else {
            this.signing = false;
            this.signError = res?.authResponse?.ErrorMessage || res?.apiCallResponse?.StatusMessage || 'Unknown error';
            this.statusMessage = 'Failed to initiate BankID signing';
            this.toastr.error(this.signError || 'Unknown error', 'BankID Error');
          }
        },
        error: (err) => {
          this.signing = false;
          this.signError = 'Failed to initiate BankID signing';
          this.statusMessage = 'Network error occurred';
          this.toastr.error('Failed to initiate BankID signing. Please check your connection and try again.', 'BankID Error');
          console.error('BankID signing error:', err);
        }
      });
    } catch (e) {
      this.signing = false;
      this.signError = 'Could not get user IP address';
      this.statusMessage = 'Failed to get user information';
      this.toastr.error('Could not get user IP address. Please try again.', 'BankID Error');
    }
  }

  generateSigningText(): string {
    const agreementType = this.agreementData?.agreementType || 'Agreement';
    const contractDate = this.previewData.contractDate || new Date().toISOString().split('T')[0];
    
    return `Please sign this ${agreementType} dated ${contractDate}. By signing, you confirm that you have read and agree to all terms and conditions.`;
  }

  generateBankIDLink() {
    if (!this.autoStartToken) return;
    
    const redirectUrl = encodeURIComponent(window.location.href);
    this.bankIDLink = `https://app.bankid.com/?autostarttoken=${this.autoStartToken}&redirect=${redirectUrl}`;
  }

  openBankIDApp() {
    if (this.bankIDLink) {
      window.open(this.bankIDLink, '_blank');
      this.toastr.info('BankID app should open in a new window. If not, please scan the QR code.', 'BankID');
    }
  }

  startQrRefresh() {
    if (!this.qrImage) return;
    
    // Refresh QR code every 5 seconds with timestamp to prevent caching
    this.qrRefreshSub = interval(5000).subscribe(() => {
      if (this.qrImage && this.signing) {
        const timestamp = new Date().getTime();
        this.qrImageWithTimestamp = `${this.qrImage}?t=${timestamp}`;
      }
    });
    
    // Set initial QR image with timestamp
    const timestamp = new Date().getTime();
    this.qrImageWithTimestamp = `${this.qrImage}?t=${timestamp}`;
  }

  stopQrRefresh() {
    if (this.qrRefreshSub) {
      this.qrRefreshSub.unsubscribe();
      this.qrRefreshSub = null;
    }
  }

  pollSignStatus() {
    this.pollSub = interval(3000).subscribe(() => {
      if (!this.orderRef) return;
      
      this.signService.collectStatus(this.orderRef, 'test').subscribe({
        next: (res) => {
          if (res?.authResponse?.Success && res?.apiCallResponse?.Success) {
            const status = res.apiCallResponse.Response.Status;
            const hintCode = res.apiCallResponse.Response.HintCode;
            
            this.signStatus = status;
            
            if (status === 'complete') {
              this.handleSigningComplete(res.apiCallResponse.Response);
            } else if (status === 'failed') {
              this.handleSigningFailed(hintCode);
            } else if (status === 'pending') {
              this.handleSigningPending(hintCode);
            }
          } else {
            this.handleSigningError(res?.authResponse?.ErrorMessage || res?.apiCallResponse?.StatusMessage || 'Unknown error');
          }
        },
        error: (err) => {
          console.error('Error polling sign status:', err);
          this.handleSigningError('Error checking signing status');
        }
      });
    });
  }

  handleSigningComplete(response: any) {
    this.signing = false;
    this.showQrCode = false;
    this.showBankIDLink = false;
    this.statusMessage = 'Signing completed successfully!';
    this.hintMessage = 'Thank you for signing the agreement.';
    
    // Store user data from completion
    if (response.CompletionData && response.CompletionData.user) {
      this.signedUserData = response.CompletionData.user;
    }
    
    this.stopPolling();
    this.stopQrRefresh();
    
    this.toastr.success('Agreement signed successfully!', 'BankID Success');
    
    // Redirect back to agreements after a short delay
    setTimeout(() => {
      this.router.navigate(['/dashboard/agreements']);
    }, 3000);
  }

  handleSigningFailed(hintCode: string) {
    this.signing = false;
    this.showQrCode = false;
    this.showBankIDLink = false;
    
    const hint = this.hintCodes[hintCode];
    this.signError = hint ? hint.message : `Signing failed: ${hintCode}`;
    this.statusMessage = 'Signing failed';
    this.hintMessage = this.signError;
    
    this.stopPolling();
    this.stopQrRefresh();
    
    this.toastr.error(this.signError, 'BankID Failed');
  }

  handleSigningPending(hintCode: string) {
    const hint = this.hintCodes[hintCode];
    this.statusMessage = 'Signing in progress...';
    this.hintMessage = hint ? hint.message : 'Please complete the signing process in your BankID app.';
  }

  handleSigningError(error: string) {
    this.signing = false;
    this.showQrCode = false;
    this.showBankIDLink = false;
    this.signError = error;
    this.statusMessage = 'Error occurred during signing';
    this.hintMessage = error;
    
    this.stopPolling();
    this.stopQrRefresh();
    
    this.toastr.error(error, 'BankID Error');
  }

  stopPolling() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }

  cancelSigning() {
    this.signing = false;
    this.showQrCode = false;
    this.showBankIDLink = false;
    this.statusMessage = '';
    this.hintMessage = '';
    this.signError = null;
    this.signStatus = null;
    
    this.stopPolling();
    this.stopQrRefresh();
    
    this.toastr.info('Signing process cancelled', 'BankID');
  }

  goBack() {
    this.router.navigate(['/dashboard/agreements']);
  }
}

