const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF from HTML template
 * @param {string} templatePath - Path to HTML template file
 * @param {Object} data - Data to replace placeholders in template
 * @param {Object} options - PDF generation options
 * @returns {Promise<string>} - Path to generated PDF file
 */
const generatePDF = async (templatePath, data, options = {}) => {
    let browser;
    try {
        // Check if template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }

        // Read template content
        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders with actual data
        htmlContent = replacePlaceholders(htmlContent, data);

        // Default PDF options for Puppeteer
        const defaultOptions = {
            format: 'A4',
            orientation: 'portrait',
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            printBackground: true,
            preferCSSPageSize: false,
            ...options
        };

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileName = `${data.agreementId || 'agreement'}_${timestamp}_${randomString}.pdf`;
        const outputPath = path.join(__dirname, '../../uploads', fileName);

        // Ensure uploads directory exists
        const uploadsDir = path.dirname(outputPath);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        console.log('Starting PDF generation with Puppeteer');
        console.log('Output path:', outputPath);

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 800 });
        
        // Set content and wait for fonts to load
        await page.setContent(htmlContent, { 
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 30000
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            ...defaultOptions,
            path: outputPath
        });

        await browser.close();
        browser = null;

        console.log('PDF generated successfully:', outputPath);
        console.log('File size:', fs.existsSync(outputPath) ? fs.statSync(outputPath).size + ' bytes' : 'File not found');
        
        return outputPath;

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error('PDF generation error:', error);
        throw new Error(`Failed to generate PDF: ${error.message}`);
    }
};

/**
 * Replace placeholders in HTML content with actual data
 * @param {string} htmlContent - HTML content with placeholders
 * @param {Object} data - Data to replace placeholders
 * @returns {string} - HTML content with replaced placeholders
 */
const replacePlaceholders = (htmlContent, data) => {
    try {
        // Handle simple placeholders like {{key}}
        let processedContent = htmlContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = data[key];
            return value !== undefined && value !== null ? String(value) : 'N/A';
        });

        // Handle nested placeholders like {{object.key}}
        processedContent = processedContent.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, obj, key) => {
            const value = data[obj] && data[obj][key];
            return value !== undefined && value !== null ? String(value) : 'N/A';
        });

        // Handle conditional blocks like {{#if key}}...{{/if}}
        processedContent = processedContent.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
            const value = data[key];
            return (value && value !== 'N/A' && value !== '') ? content : '';
        });

        // Handle custom conditional blocks for trade-in vehicle credit marking
        processedContent = processedContent.replace(/\{\{#if\s+tradeInVehicle\.creditMarking\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, content) => {
            const tradeInVehicle = data.tradeInVehicle;
            return (tradeInVehicle && tradeInVehicle.creditMarking === 'Yes') ? content : '';
        });

        // Handle custom equality check for trade-in vehicle credit marking
        processedContent = processedContent.replace(/\{\{#if\s+\(eq\s+tradeInVehicle\.creditMarking\s+"Yes"\)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, content) => {
            const tradeInVehicle = data.tradeInVehicle;
            return (tradeInVehicle && tradeInVehicle.creditMarking === 'Yes') ? content : '';
        });

        // Handle date formatting
        if (data.contractDate) {
            const date = new Date(data.contractDate);
            const formattedDate = date.toLocaleDateString('en-SE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            processedContent = processedContent.replace(/\{\{contractDate\}\}/g, formattedDate);
        }

        // Add generated date
        const generatedDate = new Date().toLocaleDateString('en-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        processedContent = processedContent.replace(/\{\{generatedDate\}\}/g, generatedDate);

        return processedContent;

    } catch (error) {
        console.error('Error replacing placeholders:', error);
        throw new Error(`Failed to process template: ${error.message}`);
    }
};

/**
 * Generate Sales Agreement PDF
 * @param {Object} agreementData - Sales agreement data
 * @returns {Promise<string>} - Path to generated PDF file
 */
const generateSalesAgreementPDF = async (agreementData) => {
    try {
        const templatePath = path.join(__dirname, '../templates/sales-agreement-pdf.html');
        console.log("agreement data in generating sales pdf : ", agreementData)
        if (agreementData.contractNumber){
            console.log("contract number", agreementData.contractNumber)
        } else {
            console.log("agreementData", agreementData)
        }
        // Prepare data for template
        const templateData = {
            contractNumber: agreementData.contractNumber || 'N/A',
            agreementId: agreementData.agreement_id || agreementData.agreementId || 'N/A',
            registrationNumber: agreementData.registrationNumber || 'N/A',
            salesDate: agreementData.sales_details?.salesDate || 'N/A',
            customerType: agreementData.customerType || 'N/A',
            telephoneNumber: agreementData.telephoneNumber || 'N/A',
            emailAddress: agreementData.emailAddress || 'N/A',
            tradeInVehicle: agreementData.sales_details?.tradeInVehicle ? {
                registrationNumber: agreementData.sales_details.tradeInVehicle.registrationNumber || 'N/A',
                purchaseDate: agreementData.sales_details.tradeInVehicle.purchaseDate || 'N/A',
                purchasePrice: agreementData.sales_details.tradeInVehicle.purchasePrice || 'N/A',
                mileage: agreementData.sales_details.tradeInVehicle.mileage || 'N/A',
                creditMarking: agreementData.sales_details.tradeInVehicle.creditMarking || 'No',
                creditor: agreementData.sales_details.tradeInVehicle.creditMarking === 'Yes' 
                    ? (agreementData.sales_details.tradeInVehicle.creditor || 'N/A') 
                    : '',
                creditAmount: agreementData.sales_details.tradeInVehicle.creditMarking === 'Yes' 
                    ? (agreementData.sales_details.tradeInVehicle.creditAmount || 'N/A') 
                    : ''
            } : null,
            salesPrice: agreementData.sales_details?.salesPrice || 'N/A',
            paymentMethod: agreementData.sales_details?.paymentMethod || 'N/A',
            vatType: agreementData.sales_details?.vatType || 'N/A',
            mileage: agreementData.sales_details?.mileage || 'N/A',
            numberOfKeys: agreementData.sales_details?.numberOfKeys || 'N/A',
            deck: agreementData.sales_details?.deck || 'N/A',
            insurer: agreementData.sales_details?.insurer || 'N/A',
            insuranceType: agreementData.sales_details?.insuranceType || 'N/A',
            warrantyProvider: agreementData.sales_details?.warrantyProvider || 'N/A',
            warrantyProduct: agreementData.sales_details?.warrantyProduct || 'N/A',
            freeTextPayment: agreementData.sales_details?.freeTextPayment || 'N/A',
            // Customer info
            buyerName: agreementData.customerType === 'Company' 
                ? agreementData.sales_details?.organization_detail?.corp_name 
                : `${agreementData.sales_details?.person_detail?.name?.givenName || ''} ${agreementData.sales_details?.person_detail?.name?.lastName || ''}`,
            buyerEmail: agreementData.emailAddress || 'N/A',
            buyerPhone: agreementData.telephoneNumber || 'N/A',
            buyerAddress: agreementData.customerType === 'Company'
                ? agreementData.sales_details?.organization_detail?.street_address
                : agreementData.sales_details?.person_detail?.addresses?.[0]?.street,
            generatedDate: new Date().toLocaleDateString()
        };

        // PDF options for sales agreement
        const pdfOptions = {
            format: 'A4',
            landscape: false,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            printBackground: true
        };
        console.log("trade in vehicle information : ", templateData.tradeInVehicle)
        return await generatePDF(templatePath, templateData, pdfOptions);

    } catch (error) {
        console.error('Error generating sales agreement PDF:', error);
        throw new Error(`Failed to generate sales agreement PDF: ${error.message}`);
    }
};

/**
 * Clean up old PDF files
 * @param {number} maxAgeHours - Maximum age of files to keep (in hours)
 */
const cleanupOldPDFs = (maxAgeHours = 24) => {
    try {
        const uploadsDir = path.join(__dirname, '../../uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            return;
        }

        const files = fs.readdirSync(uploadsDir);
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

        files.forEach(file => {
            if (file.endsWith('.pdf')) {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtime.getTime();

                if (fileAge > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up old PDF: ${file}`);
                }
            }
        });

    } catch (error) {
        console.error('Error cleaning up old PDFs:', error);
    }
};

/**
 * Generate Agency Agreement PDF
 * @param {Object} agreementData - Agency agreement data
 * @returns {Promise<string>} - Path to generated PDF file
 */
const generateAgencyAgreementPDF = async (agreementData) => {
    try {
        const templatePath = path.join(__dirname, '../templates/agency-agreement-pdf.html');
        console.log("agreement data agency agreement : ", JSON.stringify(agreementData, null, 2))
        // Prepare template data for Agency Agreement PDF
        const templateData = {
            // Basic Information
            registrationNumber: agreementData.registrationNumber || 'N/A',
            agencyDate: agreementData.agency_details?.agencyDate ? formatDate(agreementData.agency_details.agencyDate) : 'N/A',
            customerType: agreementData.customerType || 'N/A',
            emailAddress: agreementData.emailAddress || 'N/A',
            telephoneNumber: agreementData.telephoneNumber || 'N/A',

            // Conditional Company or Individual Details
            isCompany: agreementData.customerType === 'Company',
            isPrivateIndividual: agreementData.customerType === 'Private Individual',
            
            // Company Details
            organizationNumber: agreementData.agency_details?.seller?.organization_detail?.organization_number || 'N/A',
            companyName: agreementData.agency_details?.seller?.organization_detail?.corp_name || 'N/A',
            streetAddress: agreementData.agency_details?.seller?.organization_detail?.street_address || 'N/A',
            city: agreementData.agency_details?.seller?.organization_detail?.city || 'N/A',
            postalCode: agreementData.agency_details?.seller?.organization_detail?.postal_code || 'N/A',
            contactPerson: agreementData.agency_details?.seller?.organization_detail?.contact_person || 'N/A',

            // Private Individual Details
            socialSecurityNumber: agreementData.agency_details?.seller?.person_detail?.legalId || 'N/A',
            customerName: agreementData.agency_details?.seller?.person_detail 
                ? `${agreementData.agency_details.seller.person_detail.name?.givenName || ''} ${agreementData.agency_details.seller.person_detail.name?.lastName || ''}`.trim() 
                : 'N/A',
            street: agreementData.agency_details?.seller?.person_detail?.addresses?.[0]?.street || 'N/A',
            zip: agreementData.agency_details?.seller?.person_detail?.addresses?.[0]?.postalCode || 'N/A',

            // Vehicle Information
            mileage: agreementData.agency_details?.mileage || 'N/A',
            numberOfKeys: agreementData.agency_details?.numberOfKeys || 'N/A',
            deck: agreementData.agency_details?.deck || 'N/A',

            // Agency Information
            salesPrice: agreementData.agency_details?.salesPrice ? formatCurrency(agreementData.agency_details.salesPrice) : 'N/A',
            commissionRate: agreementData.agency_details?.commissionRate || 'N/A',
            commissionAmount: agreementData.agency_details?.commissionAmount ? formatCurrency(agreementData.agency_details.commissionAmount) : 'N/A',
            agencyFee: agreementData.agency_details?.agencyFee ? formatCurrency(agreementData.agency_details.agencyFee) : 'N/A',
            paymentMethod: agreementData.agency_details?.paymentMethod || 'N/A',
            vatType: agreementData.agency_details?.vatType || 'N/A',

            // Notes
            notes: agreementData.agency_details?.notes || 'No additional notes'
        };

        // PDF options for agency agreement
        const pdfOptions = {
            format: 'A4',
            landscape: false,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            printBackground: true
        };
        console.log("template data agency agreement : ", templateData)
        return await generatePDF(templatePath, templateData, pdfOptions);

    } catch (error) {
        console.error('Error generating agency agreement PDF:', error);
        throw new Error(`Failed to generate agency agreement PDF: ${error.message}`);
    }
};

/**
 * Generate Purchase Agreement PDF
 * @param {Object} agreementData - Purchase agreement data
 * @returns {Promise<string>} - Path to generated PDF file
 */
const generatePurchaseAgreementPDF = async (agreementData) => {
    try {
        const templatePath = path.join(__dirname, '../templates/purchase-agreement-pdf.html');
        
        // Prepare data for template
        const templateData = {
            contractNumber: agreementData.contractNumber || 'N/A',
            agreementId: agreementData.agreement_id || agreementData.agreementId || 'N/A',
            registrationNumber: agreementData.registrationNumber || 'N/A',
            purchaseDate: agreementData.purchase_details?.purchaseDate || 'N/A',
            telephoneNumber: agreementData.telephoneNumber || 'N/A',
            emailAddress: agreementData.emailAddress || 'N/A',
            customerType: agreementData.customerType || 'N/A',
            
            // Seller information
            sellerName: agreementData.customerType === 'Company' 
                ? agreementData.customer_details?.corp_name 
                : `${agreementData.customer_details?.name?.givenName || ''} ${agreementData.customer_details?.name?.lastName || ''}`,
            sellerEmail: agreementData.emailAddress || 'N/A',
            sellerPhone: agreementData.telephoneNumber || 'N/A',
            sellerAddress: agreementData.customerType === 'Company'
                ? agreementData.customer_details?.street_address
                : `${agreementData.customer_details?.addresses?.[0]?.street || ''} ${agreementData.customer_details?.addresses?.[0]?.number || ''}`,
            sellerOrganizationNumber: agreementData.customerType === 'Company'
                ? agreementData.customer_details?.organization_number
                : agreementData.customer_details?.legalId,
            
            // Vehicle information
            mileage: agreementData.purchase_details?.mileage || 'N/A',
            service: agreementData.purchase_details?.service || 'N/A',
            numberOfKeys: agreementData.purchase_details?.numberOfKeys || 'N/A',
            deck: agreementData.purchase_details?.deck || 'N/A',
            
            // Purchase information
            supplierType: agreementData.purchase_details?.supplierType || 'N/A',
            purchasePrice: agreementData.purchase_details?.purchasePrice || 'N/A',
            paymentMethod: agreementData.purchase_details?.paymentMethod || 'N/A',
            vatType: agreementData.purchase_details?.vatType || 'N/A',
            creditMarking: agreementData.purchase_details?.creditMarking || 'N/A',
            notes: agreementData.purchase_details?.notes || '',
            
            generatedDate: new Date().toLocaleDateString()
        };

        // PDF options for purchase agreement
        const pdfOptions = {
            format: 'A4',
            landscape: false,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            printBackground: true
        };

        return await generatePDF(templatePath, templateData, pdfOptions);

    } catch (error) {
        console.error('Error generating purchase agreement PDF:', error);
        throw new Error(`Failed to generate purchase agreement PDF: ${error.message}`);
    }
};

/**
 * Generate Receipt PDF
 * @param {Object} receiptData - Receipt data
 * @returns {Promise<string>} - Path to generated PDF file
 */
const generateReceiptPDF = async (receiptData) => {
    let browser;
    try {
        const templatePath = path.join(__dirname, '../templates/receipt-pdf.html');
        
        // Process items for template
        let itemsHtml = '';
        if (receiptData.invoiceItems && Array.isArray(receiptData.invoiceItems)) {
            receiptData.invoiceItems.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.product || 'N/A'}</td>
                        <td class="text-right">${item.number || 0}</td>
                        <td>${item.unit || 'N/A'}</td>
                        <td class="text-right">${item.priceExclVAT || 0}</td>
                        <td class="text-right">${item.vatRate || 0}%</td>
                        <td class="text-right">${item.amount || 0}</td>
                    </tr>`;
            });
        }
        
        // Calculate totals
        const subtotal = receiptData.totals?.net || 0;
        const vatAmount = receiptData.totals?.vat || 0;
        const totalAmount = receiptData.totals?.total || 0;
        
        // Prepare data for template
        const templateData = {
            // Receipt information
            receiptNumber: receiptData.contractNumber || receiptData.invoiceNumber || 'N/A',
            receiptDate: receiptData.receiptDate || receiptData.contractDate || 'N/A',
            dueDate: receiptData.dueDate || 'N/A',
            customerNumber: receiptData.customerNumber || 'N/A',
            customerType: receiptData.customerType || 'N/A',
            
            // Company information
            organizationNumber: receiptData.organizationNumber || 'N/A',
            contactPerson: receiptData.contactPerson || 'N/A',
            
            // Customer information
            email: receiptData.email || 'N/A',
            telephoneNumber: receiptData.telephoneNumber || 'N/A',
            
            // Totals
            subtotal: subtotal,
            vatAmount: vatAmount,
            totalAmount: totalAmount
        };

        // Read template content
        let htmlContent = fs.readFileSync(templatePath, 'utf8');
        
        // Replace the {{#each items}} block with actual HTML
        htmlContent = htmlContent.replace(/\{\{#each items\}\}[\s\S]*?\{\{\/each\}\}/g, itemsHtml);
        
        // Process other placeholders
        htmlContent = replacePlaceholders(htmlContent, templateData);

        // PDF options for receipt
        const pdfOptions = {
            format: 'A4',
            landscape: false,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            printBackground: true
        };

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileName = `receipt_${templateData.receiptNumber || 'receipt'}_${timestamp}_${randomString}.pdf`;
        const outputPath = path.join(__dirname, '../../uploads', fileName);

        // Ensure uploads directory exists
        const uploadsDir = path.dirname(outputPath);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        console.log('Starting receipt PDF generation with Puppeteer');
        console.log('Output path:', outputPath);

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 800 });
        
        // Set content and wait for fonts to load
        await page.setContent(htmlContent, { 
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 30000
        });

        // Generate PDF
        await page.pdf({
            ...pdfOptions,
            path: outputPath
        });

        await browser.close();
        browser = null;

        console.log('Receipt PDF generated successfully:', outputPath);
        return outputPath;

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error('Error generating receipt PDF:', error);
        throw new Error(`Failed to generate receipt PDF: ${error.message}`);
    }
};

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('sv-SE', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
    } catch (error) {
        return 'N/A';
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    if (!amount) return 'N/A';
    try {
        return new Intl.NumberFormat('sv-SE', { 
            style: 'currency', 
            currency: 'SEK',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        return amount.toString();
    }
}

module.exports = {
    generatePDF,
    generateSalesAgreementPDF,
    generateAgencyAgreementPDF,
    generatePurchaseAgreementPDF,
    generateReceiptPDF,
    replacePlaceholders,
    cleanupOldPDFs,
    formatDate,
    formatCurrency
}; 