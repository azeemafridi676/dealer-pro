const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

// Create transporter using environment variables
const transporter = nodemailer.createTransport(
    {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true, 
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
});

// Function to render EJS template
const renderTemplate = async (templateName, data) => {
    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.ejs`);
    return await ejs.renderFile(templatePath, data);
};

// Main send email function with attachments support
const sendEmail = async (to, subject, templateName, data, attachments = []) => {
    try {
        // Render the email template
        const html = await renderTemplate(templateName, data);

        // Email options
        const mailOptions = {
            from: process.env.SMTP_USER,  // Using the same email as auth
            to,
            subject,
            html,
            attachments: attachments || []
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

// Helper function to send agreement sign link with PDF
const sendAgreementSignLink = async (customerEmail, agreementData, pdfUrl) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const signLink = `${frontendUrl}/sign/${agreementData.agreement_id}`;
        
        // Prepare template data
        const templateData = {
            customerName: agreementData.customerName,
            customerEmail: customerEmail,
            agreementType: agreementData.agreementType,
            contractNumber: agreementData.contractNumber,
            contractDate: new Date(agreementData.contractDate).toLocaleDateString(),
            vehicleRegistration: agreementData.vehicleRegistration || null,
            signLink: signLink
        };

        // Prepare PDF attachment
        const attachments = [];
        if (pdfUrl) {
            attachments.push({
                filename: `${agreementData.agreementType}_Agreement_${agreementData.contractNumber}.pdf`,
                path: pdfUrl,
                contentType: 'application/pdf'
            });
        }

        // Send to customer
        const customerSubject = `🔒 Your ${agreementData.agreementType} Agreement is Ready for Signature`;
        await sendEmail(
            customerEmail,
            customerSubject,
            'agreement-sign-link',
            templateData,
            attachments
        );

        // Send to agreement creator if creatorEmail is provided
        if (agreementData.creatorEmail && agreementData.creatorEmail !== customerEmail) {
            const creatorTemplateData = {
                ...templateData,
                customerName: 'Administrator', // Override for creator email
                isCreator: true,
                customerDetails: agreementData.customerName // Include customer details for reference
            };
            
            const creatorSubject = `📋 ${agreementData.agreementType} Agreement Created - ${agreementData.contractNumber}`;
            await sendEmail(
                agreementData.creatorEmail,
                creatorSubject,
                'agreement-sign-link',
                creatorTemplateData,
                attachments
            );
        }

        console.log(`Agreement sign link sent to ${customerEmail} for agreement ${agreementData.agreement_id}`);
        return true;
    } catch (error) {
        console.error('Error sending agreement sign link:', error);
        throw error;
    }
};

module.exports = { 
    sendEmail,
    sendAgreementSignLink
}; 