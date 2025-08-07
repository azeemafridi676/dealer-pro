const asyncHandler = require("express-async-handler");
const Agreement = require("../models/agreementModel");
const { generateId } = require("../utils/generateIdUtil");
const { Vehicle } = require("../models/vehicleModel");
const Customer = require("../models/CustomerModel");
const Receipt = require("../models/receiptModel");
const { getVehicleFromAPI } = require("../services/vehicleService");
const axios = require("axios");
const {
  generateSalesAgreementPDF,
  generateAgencyAgreementPDF,
  generatePurchaseAgreementPDF,
  generateReceiptPDF,
} = require("../utils/pdfUtil");
const { uploadToCloudinary } = require("../utils/cloudinaryUtil");
const { sendAgreementSignLink } = require("../utils/sendEmailUtil");
const fs = require("fs");

const getAgreements = async (req, res) => {
  try {
    const { corp_id } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Build base query
    let query = { corp_id };

    // Add filters to the query directly
    const { searchTerm, statusAdv, typeAdv, fromDate, toDate } = req.query;
    
    if (searchTerm) {
      query.$or = [
        { registrationNumber: { $regex: searchTerm, $options: 'i' } },
        { 'customer_id.name': { $regex: searchTerm, $options: 'i' } },
        { telephoneNumber: { $regex: searchTerm, $options: 'i' } }
      ];
    } else {
      if (statusAdv) {
        query.status = { $regex: statusAdv, $options: 'i' };
      }
      if (typeAdv) {
        query.agreementType = { $regex: typeAdv, $options: 'i' };
      }
      if (fromDate || toDate) {
        query.salesDate = {};
        if (fromDate) query.salesDate.$gte = new Date(fromDate);
        if (toDate) query.salesDate.$lte = new Date(toDate);
      }
    }

    // Get total count for pagination
    const totalItems = await Agreement.countDocuments(query);

    // Fetch agreements with pagination and populate relations
    const agreements = await Agreement.find(query)
      .populate("customer_id")
      .populate("vehicle_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get stats using aggregation
    const stats = await Agreement.aggregate([
      { $match: { corp_id } },
      {
        $group: {
          _id: '$agreementType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format stats
    const statsMap = {
      purchaseAgreements: 0,
      salesAgreements: 0,
      brokerageAgreements: 0
    };

    stats.forEach(stat => {
      switch(stat._id) {
        case 'Purchase':
          statsMap.purchaseAgreements = stat.count;
          break;
        case 'Sales':
          statsMap.salesAgreements = stat.count;
          break;
        case 'Agency':
          statsMap.brokerageAgreements = stat.count;
          break;
      }
    });

    statsMap.purchasedVehicles = statsMap.purchaseAgreements;
    statsMap.soldVehicles = statsMap.salesAgreements;
    statsMap.brokeredVehicles = statsMap.brokerageAgreements;

    return res.status(200).json({
      success: true,
      data: agreements,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      stats: statsMap
    });

  } catch (error) {
    console.error("error", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

const createSalesAgreement = async (req, res) => {
  try {
    const { corp_id, id: user_id } = req.user;
    let data = req.body;

    // Validate required objects
    if (!data.sales_details) {
      return res.status(400).json({
        success: false,
        message: 'sales_details object is required',
      });
    }

    if (!data.customerType) {
      return res.status(400).json({
        success: false,
        message: 'customerType is required',
      });
    }

    // Validate customer details based on type
    if (data.customerType === 'Company' && !data.organization_detail) {
      return res.status(400).json({
        success: false,
        message: 'organization_detail is required for Company customer type',
      });
    }

    if (data.customerType === 'Private Individual' && !data.person_detail) {
      return res.status(400).json({
        success: false,
        message: 'person_detail is required for Individual customer type',
      });
    }

    // VEHICLE MANAGEMENT
    let vehicleId;
    let exists = await Vehicle.findOne({
      legalId: data.sales_details.registrationNumber,
      corp_id,
    });

    if (exists) {
      vehicleId = exists._id;  // Use vehicle_id instead of _id
      // Update vehicle if vehicle_details provided
      if (data.vehicle_details) {
        await Vehicle.updateOne(
          { _id: exists._id },  // Use vehicle_id for querying
          { $set: data.vehicle_details }
        );
      }
    } else {
      // Create new vehicle with provided details
      const vehicleData = {
        corp_id,
        created_by: user_id,
        legalId: data.sales_details.registrationNumber,
        ...data.vehicle_details
      };
      const vehicle = new Vehicle(vehicleData);
      await vehicle.save();
      vehicleId = vehicle._id;  // Use the generated vehicle_id
    }

    // CUSTOMER MANAGEMENT
    let customerId;
    let existingCustomer = await Customer.findOne({
      email: data.sales_details.emailAddress,
      corp_id,
    });

    // Prepare customer data based on type
    let customerData = {
      corp_id,
      user_id,
      customerType: data.customerType,
      role: 'buyer',
      status: 'Active',
      agreementType: 'Sales',
      email: data.sales_details.emailAddress,
      telephone: data.sales_details.telephoneNumber
    };

    // Validate and add customer type specific data
    if (data.customerType === 'Private Individual') {
      if (!data.person_detail) {
        return res.status(400).json({
          success: false,
          message: 'person_detail is required for Individual customer type',
        });
      }

      const personDetail = data.person_detail;
      if (!personDetail.name || !personDetail.addresses || !personDetail.addresses.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid person_detail: name and addresses are required',
        });
      }

      const address = personDetail.addresses[0];
      customerData = {
        ...customerData,
        name: `${personDetail.name.givenName} ${personDetail.name.lastName}`,
        address: `${address.street} ${address.number}, ${address.zip} ${address.city}`,
        person_details: personDetail
      };
    } else if (data.customerType === 'Company') {
      if (!data.organization_detail) {
        return res.status(400).json({
          success: false,
          message: 'organization_detail is required for Company customer type',
        });
      }

      const orgDetail = data.organization_detail;
      if (!orgDetail.corp_name || !orgDetail.street_address || !orgDetail.postal_code || !orgDetail.city) {
        return res.status(400).json({
          success: false,
          message: 'Invalid organization_detail: corp_name, street_address, postal_code, and city are required',
        });
      }

      customerData = {
        ...customerData,
        name: orgDetail.corp_name,
        address: `${orgDetail.street_address}, ${orgDetail.postal_code} ${orgDetail.city}`,
        company_details: orgDetail
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerType. Must be either "Individual" or "Company"',
      });
    }

    if (existingCustomer) {
      customerId = existingCustomer._id;  // Use customer_id instead of _id
      await Customer.updateOne(
        { _id: customerId },  // Use customer_id for querying
        { $set: customerData }
      );
    } else {
     
      const newCustomer = await Customer.create(customerData);
      customerId = newCustomer._id;  // Use the generated customer_id
    }

    // CREATE AGREEMENT
    const agreement = new Agreement({
      corp_id,
      created_by: user_id,
      agreementType: "Sales",
      contractNumber: data.contractNumber || "SA-" + generateId(),
      contractDate: data.sales_details.salesDate,
      salesDate: data.sales_details.salesDate,
      registrationNumber: data.sales_details.registrationNumber,
      status: "Draft",
      customer_id: customerId,  // This matches customer_id in Customer model
      vehicle_id: vehicleId,    // This matches vehicle_id in Vehicle model
      customerType: data.customerType,
      emailAddress: data.sales_details.emailAddress,
      telephoneNumber: data.sales_details.telephoneNumber,
      organizationNumber: data.customerType === 'Company' ? data.organization_detail.organization_number : '',
      socialSecurityNumber: data.customerType === 'Private Individual' ? data.person_detail.legalId : '',
      sales_details: {
        ...data.sales_details,
        person_detail: data.customerType === 'Private Individual' ? data.person_detail : null,
        organization_detail: data.customerType === 'Company' ? data.organization_detail : null
      }
    });

    const result = await agreement.save();
    console.log("Agreement created successfully:", result._id);

    // Generate PDF
    let pdfUrl = null;
    try {
      console.log("Generating sales agreement PDF...");
      console.log("sales agreeement saved in db result", result)
      const pdfPath = await generateSalesAgreementPDF(result);
      console.log("PDF generated successfully at:", pdfPath);

      const folderName = `agreements/sales/${corp_id}`;
      const fileName = `sales_agreement_${result._id}_${Date.now()}`;

      const uploadResult = await uploadToCloudinary(
        pdfPath,
        folderName,
        fileName,
        false
      );
      console.log("PDF uploaded to Cloudinary:", uploadResult.url);

      pdfUrl = uploadResult.url;

      // Add PDF to vehicle's media array
      await Vehicle.updateOne(
        { _id: vehicleId },
        {
          $push: {
            media: {
              url: pdfUrl,
              datetime: new Date().toISOString(),
              created_by: user_id,
              referance_resource: result.contractNumber || `sales_agreement_${result._id}`,
            },
          },
        }
      );

      // Save PDF URL to agreement documents
      await Agreement.updateOne(
        { _id: result._id },
        {
          $push: {
            documents: {
              type: "pdf",
              url: pdfUrl,
              name: `Sales Agreement - ${result.contractNumber}`,
              uploadedAt: new Date(),
            },
          },
        }
      );
    } catch (pdfError) {
      console.error("PDF generation/upload error:", pdfError);
    }

    const responseData = {
      ...result.toObject(),
      pdfUrl: pdfUrl,
    };

    // Send email notification with sign link
    try {
      const customerName = data.customerType === 'Company' 
        ? data.organization_detail.corp_name 
        : `${data.person_detail.name.givenName} ${data.person_detail.name.lastName}`;

      const agreementData = {
        customerName,
        agreementType: "Sales",
        contractNumber: result.contractNumber,
        contractDate: result.contractDate,
        vehicleRegistration: data.sales_details.registrationNumber,
        agreement_id: result._id,
        creatorEmail: req.user.email
      };

      await sendAgreementSignLink(data.sales_details.emailAddress, agreementData, pdfUrl);
      console.log(`Sign link email sent to ${data.sales_details.emailAddress}`);
    } catch (emailError) {
      console.error("Failed to send sign link email:", emailError);
    }

    // Update vehicle status and history
    if (vehicleId) {

      const agreementHistoryEntry = {
        agreementType: 'Sales',
        buyerName: data.customerType === 'Company' 
          ? data.organization_detail.corp_name 
          : `${data.person_detail.name.givenName} ${data.person_detail.name.lastName}`,
        basePrice: parseFloat(data.sales_details.salesPrice) || 0,
        vatStatus: data.sales_details.vatType || '',
        deck: data.sales_details.deck || '',
        inspectionDate: data.sales_details.lastService || null
      };
      
      await Vehicle.updateOne(
        { _id: vehicleId },  // Use vehicle_id for querying
        { $set: { "status.code": "SOLD" } },
        { $push: { agreementHistory: agreementHistoryEntry } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Sales agreement created successfully",
      data: responseData,
    });
  } catch (error) {
    console.error(
      "Error creating sales agreement:",
      error?.message || error?.response?.data || error
    );
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'A customer with this email already exists in corporation(s)'
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const createAgencyAgreement = async (req, res) => {
  try {
    const { corp_id, id: user_id } = req.user;
    let data = req.body;
    // Validate required objects
    if (!data.agency_details) {
      return res.status(400).json({
        success: false,
        message: 'agency_details object is required',
      });
    }

    if (!data.customerType) {
      return res.status(400).json({
        success: false,
        message: 'customerType is required',
      });
    }

    // VEHICLE MANAGEMENT
    let vehicleId;
    let exists = await Vehicle.findOne({
      legalId: data.agency_details.registrationNumber,
      corp_id,
    });

    if (exists) {
      vehicleId = exists._id;
      // Update vehicle if vehicle_details provided
      if (data.vehicle_details) {
        await Vehicle.updateOne(
          { _id: exists._id },
          { $set: data.vehicle_details }
        );
      }
    } else {
      // Create new vehicle with provided details
      const vehicleData = {
        corp_id,
        created_by: user_id,
        legalId: data.agency_details.registrationNumber,
        ...data.vehicle_details
      };
      const vehicle = new Vehicle(vehicleData);
      await vehicle.save();
      vehicleId = vehicle._id;
    }

    // CUSTOMER (SELLER) MANAGEMENT
    let customerId;
    let existingCustomer = await Customer.findOne({
      email: data.emailAddress,
      corp_id,
    });

    // Prepare customer data based on type
    let customerData = {
      corp_id,
      user_id,
      customerType: data.customerType,
      role: 'seller',
      status: 'Active',
      agreementType: 'Agency',
      email: data.emailAddress,
      telephone: data.telephoneNumber
    };

    // Validate and add customer type specific data
    if (data.customerType === 'Private Individual') {
      if (!data.person_detail) {
        return res.status(400).json({
          success: false,
          message: 'person_detail is required for Individual customer type',
        });
      }

      const personDetail = data.person_detail;
      if (!personDetail.name || !personDetail.addresses || !personDetail.addresses.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid person_detail: name and addresses are required',
        });
      }

      const address = personDetail.addresses[0];
      customerData = {
        ...customerData,
        name: `${personDetail.name.givenName} ${personDetail.name.lastName}`,
        address: `${address.street} ${address.number}, ${address.zip} ${address.city}`,
        person_details: personDetail
      };
    } else if (data.customerType === 'Company') {
      if (!data.organization_detail) {
        return res.status(400).json({
          success: false,
          message: 'organization_detail is required for Company customer type',
        });
      }

      const orgDetail = data.organization_detail;
      if (!orgDetail.corp_name || !orgDetail.street_address || !orgDetail.postal_code || !orgDetail.city) {
        return res.status(400).json({
          success: false,
          message: 'Invalid organization_detail: corp_name, street_address, postal_code, and city are required',
        });
      }

      customerData = {
        ...customerData,
        name: orgDetail.corp_name,
        address: `${orgDetail.street_address}, ${orgDetail.postal_code} ${orgDetail.city}`,
        company_details: orgDetail
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerType. Must be either "Private Individual" or "Company"',
      });
    }

    if (existingCustomer) {
      customerId = existingCustomer._id;
      await Customer.updateOne(
        { _id: customerId },
        { $set: customerData }
      );
    } else {
      const newCustomer = await Customer.create(customerData);
      customerId = newCustomer._id;
    }

    // CREATE AGREEMENT
    const agreement = new Agreement({
      corp_id,
      created_by: user_id,
      agreementType: "Agency",
      contractNumber: data.contractNumber || "AG-" + generateId(),
      contractDate: data.agency_details.agencyDate,
      registrationNumber: data.agency_details.registrationNumber,
      status: "Draft",
      customer_id: customerId,
      vehicle_id: vehicleId,
      customerType: data.customerType,
      emailAddress: data.emailAddress,
      telephoneNumber: data.telephoneNumber,
      agency_details: {
        ...data.agency_details,
        seller: {
          customer_id: customerId,
          customerType: data.customerType,
          ...(data.customerType === 'Company' ? { organization_detail: data.organization_detail } : { person_detail: data.person_detail })
        },
        buyer: data.agency_details.buyer // Current organization details
      }
    });

    const result = await agreement.save();
    console.log("Agreement created successfully:", result._id);

    // Generate PDF
    let pdfUrl = null;
    try {
      console.log("Generating agency agreement PDF...");
      const pdfPath = await generateAgencyAgreementPDF(result);
      console.log("PDF generated successfully at:", pdfPath);

      const folderName = `agreements/agency/${corp_id}`;
      const fileName = `agency_agreement_${result._id}_${Date.now()}`;

      const uploadResult = await uploadToCloudinary(
        pdfPath,
        folderName,
        fileName,
        false
      );
      console.log("PDF uploaded to Cloudinary:", uploadResult.url);

      pdfUrl = uploadResult.url;

      // Add PDF to vehicle's media array
      await Vehicle.updateOne(
        { _id: vehicleId },
        {
          $push: {
            media: {
              url: pdfUrl,
              datetime: new Date().toISOString(),
              created_by: user_id,
              referance_resource: result.contractNumber || `agency_agreement_${result._id}`,
            },
          },
        }
      );

      // Save PDF URL to agreement documents
      await Agreement.updateOne(
        { _id: result._id },
        {
          $push: {
            documents: {
              type: "pdf",
              url: pdfUrl,
              name: `Agency Agreement - ${result.contractNumber}`,
              uploadedAt: new Date(),
            },
          },
        }
      );
    } catch (pdfError) {
      console.error("PDF generation/upload error:", pdfError);
    }

    const responseData = {
      ...result.toObject(),
      pdfUrl: pdfUrl,
    };

    // Send email notification with sign link
    try {
      const customerName = data.customerType === 'Company' 
        ? data.organization_detail.corp_name 
        : `${data.person_detail.name.givenName} ${data.person_detail.name.lastName}`;

      const agreementData = {
        customerName,
        agreementType: "Agency",
        contractNumber: result.contractNumber,
        contractDate: result.contractDate,
        vehicleRegistration: data.agency_details.registrationNumber,
        agreement_id: result._id,
        creatorEmail: req.user.email
      };

      await sendAgreementSignLink(data.emailAddress, agreementData, pdfUrl);
      console.log(`Sign link email sent to ${data.emailAddress}`);
    } catch (emailError) {
      console.error("Failed to send sign link email:", emailError);
    }

    // Update vehicle status and history
    if (vehicleId) {
      const agreementHistoryEntry = {
        agreementType: 'Agency',
        sellerName: data.customerType === 'Company' 
          ? data.organization_detail.corp_name 
          : `${data.person_detail.name.givenName} ${data.person_detail.name.lastName}`,
        buyerName: data.agency_details.buyer.corp_name,
        basePrice: parseFloat(data.agency_details.salesPrice) || 0,
        commissionRate: parseFloat(data.agency_details.commissionRate) || 0,
        commissionAmount: parseFloat(data.agency_details.commissionAmount) || 0,
        agencyFee: parseFloat(data.agency_details.agencyFee) || 0,
        deck: data.agency_details.deck || '',
        mileage: data.agency_details.mileage || null
      };
      
      await Vehicle.updateOne(
        { _id: vehicleId },
        { 
          $set: { "status.code": "AGENCY" },
          $push: { agreementHistory: agreementHistoryEntry }
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Agency agreement created successfully",
      data: responseData,
    });
  } catch (error) {
    console.error(
      "Error creating agency agreement:",
      error?.message || error?.response?.data || error
    );
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'A customer with this email already exists in corporation(s)'
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const createPurchaseAgreement = async (req, res) => {
  try {
    const { corp_id, id: user_id } = req.user;
    let data = req.body;

    // Validate required objects
    if (!data.purchase_details) {
      return res.status(400).json({
        success: false,
        message: 'purchase_details object is required',
      });
    }

    if (!data.customerType) {
      return res.status(400).json({
        success: false,
        message: 'customerType is required',
      });
    }

    if (!data.customer_details) {
      return res.status(400).json({
        success: false,
        message: 'customer_details is required',
      });
    }

    // VEHICLE MANAGEMENT - Check if vehicle exists, if not create it
    let vehicleId;
    let exists = await Vehicle.findOne({
      legalId: data.purchase_details.registrationNumber,
      corp_id,
    });
    if (exists) {
      vehicleId = exists._id;
      // Update vehicle if vehicle_details provided
      if (data.vehicle_details) {
        await Vehicle.updateOne(
          { _id: exists._id },
          { $set: data.vehicle_details }
        );
      }
    } else {
      // Create new vehicle with provided details
      const vehicleData = {
        corp_id,
        created_by: user_id,
        legalId: data.purchase_details.registrationNumber,
        ...data.vehicle_details
      };
      const vehicle = new Vehicle(vehicleData);
      await vehicle.save();
      vehicleId = vehicle._id;
    }

    // CUSTOMER MANAGEMENT
    let customerId;
    let existingCustomer = await Customer.findOne({
      email: (data.purchase_details.emailAddress).trim(),
      corp_id,
    });
    console.log("corp_id of customer ", corp_id)
    console.log("existing customer", existingCustomer)
    // Prepare customer data based on type
    let customerData = {
      corp_id,
      user_id,
      type: data.customerType,
      customerType: data.customerType,
      role: 'supplier',
      status: 'Active',
      agreementType: 'Purchase',
      email: data.purchase_details.emailAddress,
      telephone: data.purchase_details.telephoneNumber
    };

    // Validate and add customer type specific data
    if (data.customerType === 'Private Individual') {
      if (!data.customer_details.name || !data.customer_details.addresses || !data.customer_details.addresses.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_details: name and addresses are required for Individual customer type',
        });
      }

      const address = data.customer_details.addresses[0];
      customerData = {
        ...customerData,
        name: `${data.customer_details.name.givenName} ${data.customer_details.name.lastName}`,
        address: `${address.street} ${address.number}, ${address.zip} ${address.city}`,
        person_details: data.customer_details,
        socialSecurityNumber: data.customer_details.legalId || ''
      };
    } else if (data.customerType === 'Company') {
      if (!data.customer_details.corp_name || !data.customer_details.street_address || !data.customer_details.postal_code || !data.customer_details.city) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_details: corp_name, street_address, postal_code, and city are required for Company customer type',
        });
      }

      customerData = {
        ...customerData,
        name: data.customer_details.corp_name,
        address: `${data.customer_details.street_address}, ${data.customer_details.postal_code} ${data.customer_details.city}`,
        company_details: data.customer_details,
        organizationNumber: data.customer_details.organization_number || ''
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerType. Must be either "Private Individual" or "Company"',
      });
    }

    if (existingCustomer) {
      customerId = existingCustomer._id;
      await Customer.updateOne(
        { _id: customerId },
        { $set: customerData }
      );
    } else {
      console.log("create new customer", customerData)
      const newCustomer = await Customer.create(customerData);
      console.log("new customer created")
      customerId = newCustomer._id;
    }

    // CREATE AGREEMENT
    const agreement = new Agreement({
      corp_id,
      created_by: user_id,
      agreementType: "Purchase",
      contractNumber: data.contractNumber || "PA-" + generateId(),
      contractDate: data.purchase_details.purchaseDate,
      registrationNumber: data.purchase_details.registrationNumber,
      status: "Draft",
      customer_id: customerId,
      vehicle_id: vehicleId,
      customerType: data.customerType,
      emailAddress: data.purchase_details.emailAddress,
      telephoneNumber: data.purchase_details.telephoneNumber,
      purchase_details: {
        ...data.purchase_details,
        purchaseDate: data.purchase_details.purchaseDate
      },
      vehicle_details: data.vehicle_details,
      customer_details: data.customer_details
    });

    const result = await agreement.save();
    console.log("Agreement created successfully:", result._id);

    // Generate PDF
    let pdfUrl = null;
    try {
      console.log("Generating purchase agreement PDF...");
      const pdfPath = await generatePurchaseAgreementPDF(result);
      console.log("PDF generated successfully at:", pdfPath);

      const folderName = `agreements/purchase/${corp_id}`;
      const fileName = `purchase_agreement_${result._id}_${Date.now()}`;

      const uploadResult = await uploadToCloudinary(
        pdfPath,
        folderName,
        fileName,
        false
      );
      console.log("PDF uploaded to Cloudinary:", uploadResult.url);

      pdfUrl = uploadResult.url;

      // Add PDF to vehicle's media array
      await Vehicle.updateOne(
        { _id: vehicleId },
        {
          $push: {
            media: {
              url: pdfUrl,
              datetime: new Date().toISOString(),
              created_by: user_id,
              referance_resource: result.contractNumber || `purchase_agreement_${result._id}`,
            },
          },
        }
      );

      // Save PDF URL to agreement documents
      await Agreement.updateOne(
        { _id: result._id },
        {
          $push: {
            documents: {
              type: "pdf",
              url: pdfUrl,
              name: `Purchase Agreement - ${result.contractNumber}`,
              uploadedAt: new Date(),
            },
          },
        }
      );
    } catch (pdfError) {
      console.error("PDF generation/upload error:", pdfError);
    }

    const responseData = {
      ...result.toObject(),
      pdfUrl: pdfUrl,
    };

    // Send email notification with sign link
    try {
      const customerName = data.customerType === 'Company' 
        ? data.customer_details.corp_name 
        : `${data.customer_details.name.givenName} ${data.customer_details.name.lastName}`;

      const agreementData = {
        customerName,
        agreementType: "Purchase",
        contractNumber: result.contractNumber,
        contractDate: result.contractDate,
        vehicleRegistration: data.purchase_details.registrationNumber,
        agreement_id: result._id,
        creatorEmail: req.user.email
      };

      await sendAgreementSignLink(data.purchase_details.emailAddress, agreementData, pdfUrl);
      console.log(`Sign link email sent to ${data.purchase_details.emailAddress}`);
    } catch (emailError) {
      console.error("Failed to send sign link email:", emailError);
    }

    // Update vehicle status and history
    if (vehicleId) {
      const agreementHistoryEntry = {
        agreementType: 'Purchase',
        sellerName: data.customerType === 'Company' 
          ? data.customer_details.corp_name 
          : `${data.customer_details.name.givenName} ${data.customer_details.name.lastName}`,
        basePrice: parseFloat(data.purchase_details.purchasePrice) || 0,
        vatStatus: data.purchase_details.vatType || '',
        deck: data.purchase_details.deck || '',
        inspectionDate: data.purchase_details.service || null
      };
      
      await Vehicle.updateOne(
        { _id: vehicleId },
        { 
          $set: { "status.code": "PURCHASED" },
          $push: { agreementHistory: agreementHistoryEntry }
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Purchase agreement created successfully",
      data: responseData,
    });
  } catch (error) {
    console.error(
      "Error creating purchase agreement:",
      error?.message || error?.response?.data || error
    );
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'A customer with this email already exists in corporation(s)'
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const createReceiptAgreement = async (req, res) => {
  try {
    const { corp_id, id: user_id } = req.user;
    const data = req.body;

    // Validate required customer fields
    const requiredFields = [
      "sellerName",
      "sellerOrg",
      "sellerTelephone",
      "sellerEmail",
      "customerName",
      "customerOrg",
      "customerTelephone",
      "customerEmail",
      "itemDescription",
      "itemPrice",
    ];

    const missingFields = requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Create seller customer
    const sellerCustomerId = generateId();
    const newSellerCustomer = await Customer.create({
      customer_id: sellerCustomerId,
      corp_id,
      user_id: user_id,
      name: data.sellerName,
      companyName: data.sellerOrg,
      type: data.sellerType || "Private",
      role: "seller",
      telephone: data.sellerTelephone,
      email: data.sellerEmail,
      address: data.sellerAddress || "N/A",
      status: "Active",
      organizationNumber: (data.sellerType === "Company" ? data.sellerSocialSecurityNumber : ""),
      socialSecurityNumber: (data.sellerType === "Company" ? "" : data.sellerSocialSecurityNumber || ""),
      // Contract-related information
      agreementType: "Receipt",
      numberOfOrders: 1,
      totalSpent: parseFloat(data.itemPrice) || 0,
      latestPurchase: new Date(data.receiptDate || new Date()),
    });

    // Create customer
    const customerCustomerId = generateId();
    const newCustomer = await Customer.create({
      customer_id: customerCustomerId,
      corp_id,
      user_id: user_id,
      name: data.customerName,
      companyName: data.customerOrg,
      type: data.customerType || "Private",
      role: "customer",
      telephone: data.customerTelephone,
      email: data.customerEmail,
      address: data.customerAddress || "N/A",
      status: "Active",
      organizationNumber: (data.customerType === "Company" ? data.customerSocialSecurityNumber : ""),
      socialSecurityNumber: (data.customerType === "Company" ? "" : data.customerSocialSecurityNumber || ""),
      // Contract-related information
      agreementType: "Receipt",
      numberOfOrders: 1,
      totalSpent: parseFloat(data.itemPrice) || 0,
      latestPurchase: new Date(data.receiptDate || new Date()),
    });

    // Fetch or create organization (you might need to implement this)
    const organizationId = generateId(); // This should be replaced with actual organization lookup/creation

    // Build articles array
    const articles = [
      {
        description: data.itemDescription,
        price: Number(data.itemPrice),
        number: Number(data.itemNumber) || 1,
      },
    ];

    // Build invoice items
    const invoiceItems = [
      {
        product: data.itemDescription,
        number: Number(data.itemNumber) || 1,
        priceExclVAT: Number(data.itemPrice),
        amount: Number(data.itemPrice) * (Number(data.itemNumber) || 1),
      },
    ];

    // Generate receipt ID
    const receiptId = generateId();

    const receipt = new Receipt({
      receipt_id: receiptId,
      corp_id,
      created_by: user_id,
      organization: organizationId,
      customer: customerCustomerId,
      receiptNumber: "AGREEMENT-" + generateId(),
      receiptDate: data.receiptDate || new Date(),
      seller: sellerCustomerId,
      articles,
      invoiceItems,
      subtotal: Number(data.subtotal),
      moms: Number(data.moms),
      totally: Number(data.totally),

      // Add required fields
      customerNumber: data.customerNumber || customerCustomerId.toString(),
      customerType: data.customerType || "Private",
      organizationNumber: data.organizationNumber || "000000-0000", // Default placeholder
      dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      email: data.customerEmail,
      telephoneNumber: data.customerTelephone,

      // Optional additional fields
      contactPerson: data.customerName,
      language: data.language || "English",
      currency: data.currency || "SEK",
      invoiceStatus: "PENDING",
    });

    await receipt.save();

    // Always generate PDF
    try {
      // Prepare receipt data for PDF generation
      const receiptDataForPDF = {
        contractNumber: receipt.receiptNumber,
        receiptDate: receipt.receiptDate,
        dueDate: receipt.dueDate,
        customerNumber: receipt.customerNumber,
        customerType: receipt.customerType,
        organizationNumber: receipt.organizationNumber,
        contactPerson: receipt.contactPerson,
        email: receipt.email,
        telephoneNumber: receipt.telephoneNumber,
        invoiceItems: receipt.invoiceItems,
        totals: {
          net: receipt.subtotal,
          vat: receipt.moms,
          total: receipt.totally,
        },
      };

      // Generate PDF
      const pdfPath = await generateReceiptPDF(receiptDataForPDF);
      console.log("Receipt PDF generated successfully at:", pdfPath);

      // Upload PDF to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        pdfPath,
        "receipts",
        `receipt_${receipt.receipt_id}`,
        false // Don't keep local file
      );
      console.log("Receipt PDF uploaded to Cloudinary:", cloudinaryResult.url);

      // Send email notification with sign link
      try {
        const agreementData = {
          agreement_id: receipt.receipt_id,
          customerName: data.customerName,
          agreementType: "Receipt",
          contractNumber: receipt.receiptNumber,
          contractDate: receipt.receiptDate,
          vehicleRegistration: null, // Receipts don't have vehicles
          agreement_id: receipt.receipt_id,
          creatorEmail: req.user.email
        };

        await sendAgreementSignLink(
          data.customerEmail,
          agreementData,
          cloudinaryResult.secure_url
        );
        console.log(`Sign link email sent to ${data.customerEmail}`);
      } catch (emailError) {
        console.error("Failed to send sign link email:", emailError);
        // Don't fail the request if email fails
      }

      return res.status(201).json({
        success: true,
        message: "Receipt agreement created successfully with PDF",
        data: {
          ...receipt.toObject(),
          pdfUrl: cloudinaryResult.url,
        },
      });
    } catch (pdfError) {
      console.error("PDF generation/upload error:", pdfError);
      // Return success for receipt creation, but mention PDF issue
      return res.status(201).json({
        success: true,
        message:
          "Receipt agreement created successfully, but PDF generation failed",
        data: receipt,
        pdfError: pdfError.message,
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'A customer with this email already exists in corporation(s)'
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const deleteAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Agreement ID is required" });
    }
    // Find agreement by agreement_id
    const agreement = await Agreement.findOne({ _id: id });
    if (!agreement) {
      return res
        .status(404)
        .json({ success: false, message: "Agreement not found" });
    }
    // Collect all related customer IDs
    const customerIds = new Set();
    if (agreement.customer_id) customerIds.add(agreement.customer_id);
    if (agreement.meta) {
      if (agreement.meta.buyer?.customer_id)
        customerIds.add(agreement.meta.buyer.customer_id);
      if (agreement.meta.seller?.customer_id)
        customerIds.add(agreement.meta.seller.customer_id);
      if (agreement.meta.intermediary?.customer_id)
        customerIds.add(agreement.meta.intermediary.customer_id);
      if (agreement.meta.client?.customer_id)
        customerIds.add(agreement.meta.client.customer_id);
    }
    // Delete agreement
    await Agreement.deleteOne({ _id: id });
    // Delete related customers
    if (customerIds.size > 0) {
      await Customer.deleteMany({
        customer_id: { $in: Array.from(customerIds) },
      });
    }
    return res.status(200).json({
      success: true,
      message: "Agreement and related customers deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// POST /api/agreements/bankid-sign
const bankidSign = asyncHandler(async (req, res) => {
  const { endUserIp, userVisibleData, userNonVisibleData, env } = req.body;

  // env: 'test' or 'live' (default: test)
  const BankENV = process.env.BankENV === "live";

  // Use test endpoints by default
  const apiUser = BankENV
    ? process.env.BANKID_LIVE_API_USER
    : process.env.BANKID_TEST_API_USER || "test_user";
  const password = BankENV
    ? process.env.BANKID_LIVE_PASSWORD
    : process.env.BANKID_TEST_PASSWORD || "test_password";
  const companyApiGuid = BankENV
    ? process.env.BANKID_LIVE_COMPANY_API_GUID
    : process.env.BANKID_TEST_COMPANY_API_GUID || "test_guid";

  // Use the test endpoints provided in the documentation
  const signUrl = BankENV
    ? process.env.BANKID_LIVE_SIGN_URL ||
      "https://banksign-test.azurewebsites.net/api/sign"
    : "https://banksign-test.azurewebsites.net/api/sign";

  try {
    const requestBody = {
      apiUser,
      password,
      companyApiGuid,
      endUserIp: endUserIp || "127.0.0.1",
      userVisibleData: userVisibleData || "",
      userNonVisibleData: userNonVisibleData || "",
      getQr: true,
    };

    console.log("BankID Sign Request:", {
      url: signUrl,
      body: { ...requestBody, password: "***" }, // Hide password in logs
    });

    const response = await axios.post(signUrl, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    console.log("BankID Sign Response:", response.data);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("BankID Sign Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    return res.status(500).json({
      success: false,
      message: error?.response?.data || error.message || "BankID sign error",
      authResponse: {
        Success: false,
        ErrorMessage:
          error?.response?.data?.authResponse?.ErrorMessage ||
          error.message ||
          "Failed to initiate BankID signing",
      },
      apiCallResponse: null,
    });
  }
});

// POST /api/agreements/bankid-collect
const bankidCollectStatus = asyncHandler(async (req, res) => {
  const { orderRef, env } = req.body;

  if (!orderRef) {
    return res.status(400).json({
      success: false,
      message: "OrderRef is required",
      authResponse: {
        Success: false,
        ErrorMessage: "OrderRef is required",
      },
      apiCallResponse: null,
    });
  }

  const BankENV = process.env.BankENV || "test";

  const apiUser = BankENV
    ? process.env.BANKID_LIVE_API_USER
    : process.env.BANKID_TEST_API_USER || "test_user";
  const password = BankENV
    ? process.env.BANKID_LIVE_PASSWORD
    : process.env.BANKID_TEST_PASSWORD || "test_password";
  const companyApiGuid = BankENV
    ? process.env.BANKID_LIVE_COMPANY_API_GUID
    : process.env.BANKID_TEST_COMPANY_API_GUID || "test_guid";

  // Use the test endpoints provided in the documentation
  const collectUrl = BankENV
    ? process.env.BANKID_LIVE_COLLECT_URL ||
      "https://banksign-test.azurewebsites.net/api/collectstatus"
    : "https://banksign-test.azurewebsites.net/api/collectstatus";

  try {
    const requestBody = {
      apiUser,
      password,
      companyApiGuid,
      orderRef,
    };

    console.log("BankID Collect Request:", {
      url: collectUrl,
      body: { ...requestBody, password: "***" }, // Hide password in logs
    });

    const response = await axios.post(collectUrl, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000, // 15 second timeout
    });

    console.log("BankID Collect Response:", response.data);
    fs.appendFileSync(
      "bankid-collect.log",
      JSON.stringify(response.data, null, 2)
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("BankID Collect Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    return res.status(500).json({
      success: false,
      message: error?.response?.data || error.message || "BankID collect error",
      authResponse: {
        Success: false,
        ErrorMessage:
          error?.response?.data?.authResponse?.ErrorMessage ||
          error.message ||
          "Failed to collect BankID status",
      },
      apiCallResponse: null,
    });
  }
});

// Get single agreement by ID (public access for signing)
const getAgreementForSigning = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID is required",
      });
    }

    // Find agreement by agreement_id (no corp_id restriction for public access)
    const agreement = await Agreement.findOne({
      _id: id,
    })
      .populate("customer_id")
      .populate("vehicle_id")
      .sort({ createdAt: -1 })
      .lean();

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found",
      });
    }

    // Extract PDF URL from documents array if available
    let pdfUrl = null;
    if (agreement.documents && agreement.documents.length > 0) {
      const pdfDocument = agreement.documents.find(
        (doc) => doc.url && doc.url.includes(".pdf")
      );
      pdfUrl = pdfDocument ? pdfDocument.url : null;
    }

    // Prepare response with agreement data and PDF URL
    const responseData = {
      ...agreement,
      pdfUrl: pdfUrl,
      agreementType: agreement.agreementType,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      message: "Agreement retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching agreement for signing:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get single agreement by ID
const getAgreementById = asyncHandler(async (req, res) => {
  try {
    // const { corp_id } = req.user;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID is required",
      });
    }

    // Find agreement by agreement_id
    const agreement = await Agreement.findOne({
      _id: id,
      // corp_id
    })
      .populate("customer_id")
      .populate("vehicle_id")
      .lean();

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found",
      });
    }

    // Extract PDF URL from documents array if available
    let pdfUrl = null;
    if (agreement.documents && agreement.documents.length > 0) {
      const pdfDocument = agreement.documents.find(
        (doc) => doc.url && doc.url.includes(".pdf")
      );
      pdfUrl = pdfDocument ? pdfDocument.url : null;
    }

    // Prepare response with agreement data and PDF URL
    const responseData = {
      ...agreement,
      pdfUrl: pdfUrl,
      agreementType: agreement.agreementType,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      message: "Agreement retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching agreement by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

const uploadAgreementDocument = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { corp_id, id: user_id } = req.user;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No document uploaded",
      });
    }

    // Find agreement
    const agreement = await Agreement.findOne({
      _id: id,
      corp_id,
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found",
      });
    }

    // Upload to Cloudinary
    const folderName = `agreements/documents/${corp_id}`;
    const fileName = `document_${id}_${Date.now()}`;

    const cloudinaryResult = await uploadToCloudinary(
      req.file.path,
      folderName,
      fileName,
      false // Delete local file after upload
    );

    // Prepare document entry
    const documentEntry = {
      name: req.file.originalname,
      url: cloudinaryResult.url,
      type: req.file.mimetype,
      size: req.file.size,
      uploadedBy: user_id,
      uploadedAt: new Date(),
    };

    // Add document to agreement
    await Agreement.updateOne(
      { _id: id },
      { $push: { documents: documentEntry } }
    );

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data: documentEntry,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

const updateSalesAgreement = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { corp_id, id: user_id } = req.user;

    // Find the existing agreement
    const existingAgreement = await Agreement.findOne({ 
      _id: id, 
      corp_id,
      agreementType: 'Sales'
    });

    if (!existingAgreement) {
      return res.status(404).json({
        success: false,
        message: 'Sales agreement not found or you do not have permission to update it'
      });
    }

    // Validate update data
    if (!updateData.sales_details || !updateData.sales_details.registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update data. Registration number is required.'
      });
    }

    const updatedPayload = { 
      ...updateData,
      updatedAt: new Date(),
      status: 'Updated'
    };

    // Update the agreement
    const updatedAgreement = await Agreement.findByIdAndUpdate(
      id, 
      updatedPayload, 
      { 
        new: true,
        runValidators: true
      }
    );

    // Generate new PDF with edit number
    let pdfUrl = null;
    let pdfError = null;
    try {
      console.log("Generating updated sales agreement PDF...");
      const pdfPath = await generateSalesAgreementPDF(updatedAgreement);
      console.log("Updated PDF generated successfully at:", pdfPath);

      // Get existing PDFs and find the highest edit number
      const existingPDFs = updatedAgreement.documents.filter(doc => 
        doc.type === 'pdf' && doc.name.includes('Sales Agreement')
      );

      // Extract edit numbers from existing PDFs
      const editNumbers = existingPDFs.map(doc => {
        const match = doc.name.match(/\(Edit (\d+)\)/);
        return match ? parseInt(match[1]) : 0;
      });

      // Get the highest edit number, default to 0 if no edits exist
      const highestEditNumber = Math.max(...editNumbers, 0);
      const newEditNumber = highestEditNumber + 1;

      const folderName = `agreements/sales/${corp_id}`;
      const fileName = `sales_agreement_${updatedAgreement._id}_edit-${newEditNumber}_${Date.now()}`;

      const uploadResult = await uploadToCloudinary(
        pdfPath,
        folderName,
        fileName,
        false
      );
      console.log("Updated PDF uploaded to Cloudinary:", uploadResult.url);

      pdfUrl = uploadResult.url;

      // Add PDF to vehicle's media array
      await Vehicle.updateOne(
        { _id: updatedAgreement.vehicle_id },
        {
          $push: {
            media: {
              url: pdfUrl,
              datetime: new Date().toISOString(),
              created_by: user_id,
              referance_resource: updatedAgreement.contractNumber || `sales_agreement_${updatedAgreement._id}`,
            },
          },
        }
      );

      // Append new PDF URL to agreement documents
      await Agreement.updateOne(
        { _id: updatedAgreement._id },
        {
          $push: {
            documents: {
              type: "pdf",
              url: pdfUrl,
              name: `Sales Agreement - ${updatedAgreement.contractNumber} (Edit ${newEditNumber})`,
              uploadedAt: new Date(),
            },
          },
        }
      );
    } catch (error) {
      console.error("PDF generation/upload error:", error);
      pdfError = error.message;
    }

    // Send email notification with sign link for the updated agreement
    try {
      if (pdfUrl) { // Only send email if PDF was successfully uploaded
        const customerName = updateData.customerType === 'Company' 
          ? updateData.organization_detail.corp_name 
          : `${updateData.person_detail.name.givenName} ${updateData.person_detail.name.lastName}`;

        const agreementData = {
          customerName,
          agreementType: "Sales",
          contractNumber: updatedAgreement.contractNumber,
          contractDate: updatedAgreement.contractDate,
          vehicleRegistration: updateData.sales_details.registrationNumber,
          agreement_id: updatedAgreement._id,
          creatorEmail: req.user.email
        };

        await sendAgreementSignLink(updateData.sales_details.emailAddress, agreementData, pdfUrl);
        console.log(`Sign link email sent to ${updateData.sales_details.emailAddress}`);
      }
    } catch (emailError) {
      console.error("Failed to send sign link email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: pdfError 
        ? 'Sales agreement updated successfully, but PDF upload failed. Please try uploading the PDF again later.' 
        : 'Sales agreement updated successfully',
      data: {
        ...updatedAgreement.toObject(),
        pdfUrl: pdfUrl
      },
      pdfError: pdfError
    });
  } catch (error) {
    console.error('Error updating sales agreement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sales agreement',
      error: error.message
    });
  }
});

const updatePurchaseAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { corp_id, id: user_id } = req.user;
    const updateData = req.body;

    // Find the existing agreement
    const existingAgreement = await Agreement.findOne({ 
      _id: id, 
      corp_id,
      agreementType: 'Purchase'
    });

    if (!existingAgreement) {
      return res.status(404).json({
        success: false,
        message: 'Purchase agreement not found or you do not have permission to update it'
      });
    }

    // Validate update data
    if (!updateData.purchase_details || !updateData.purchase_details.registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update data. Registration number is required.'
      });
    }

    // Update the agreement
    const updatedAgreement = await Agreement.findByIdAndUpdate(
      id, 
      { 
        ...updateData,
        updatedAt: new Date(),
        status: 'Updated'
      }, 
      { 
        new: true,
        runValidators: true
      }
    );

    // Generate new PDF with edit number
    let pdfUrl = null;
    let pdfError = null;
    try {
      console.log("Generating updated purchase agreement PDF...");
      const pdfPath = await generatePurchaseAgreementPDF(updatedAgreement);
      console.log("Updated PDF generated successfully at:", pdfPath);

      // Get existing PDFs and find the highest edit number
      const existingPDFs = updatedAgreement.documents.filter(doc => 
        doc.type === 'pdf' && doc.name.includes('Purchase Agreement')
      );

      // Extract edit numbers from existing PDFs
      const editNumbers = existingPDFs.map(doc => {
        const match = doc.name.match(/\(Edit (\d+)\)/);
        return match ? parseInt(match[1]) : 0;
      });

      // Get the highest edit number, default to 0 if no edits exist
      const highestEditNumber = Math.max(...editNumbers, 0);
      const newEditNumber = highestEditNumber + 1;

      const folderName = `agreements/purchase/${corp_id}`;
      const fileName = `purchase_agreement_${updatedAgreement._id}_edit-${newEditNumber}_${Date.now()}`;

      const uploadResult = await uploadToCloudinary(
        pdfPath,
        folderName,
        fileName,
        false
      );
      console.log("Updated PDF uploaded to Cloudinary:", uploadResult.url);

      pdfUrl = uploadResult.url;

      // Add PDF to vehicle's media array
      await Vehicle.updateOne(
        { _id: updatedAgreement.vehicle_id },
        {
          $push: {
            media: {
              url: pdfUrl,
              datetime: new Date().toISOString(),
              created_by: user_id,
              referance_resource: updatedAgreement.contractNumber || `purchase_agreement_${updatedAgreement._id}`,
            },
          },
        }
      );

      // Append new PDF URL to agreement documents
      await Agreement.updateOne(
        { _id: updatedAgreement._id },
        {
          $push: {
            documents: {
              type: "pdf",
              url: pdfUrl,
              name: `Purchase Agreement - ${updatedAgreement.contractNumber} (Edit ${newEditNumber})`,
              uploadedAt: new Date(),
            },
          },
        }
      );
    } catch (error) {
      console.error("PDF generation/upload error:", error);
      pdfError = error.message;
    }

    // Send email notification with sign link for the updated agreement
    try {
      if (pdfUrl) { // Only send email if PDF was successfully uploaded
        const customerName = updateData.customerType === 'Company' 
          ? updateData.customer_details.corp_name 
          : `${updateData.customer_details.name.givenName} ${updateData.customer_details.name.lastName}`;

        const agreementData = {
          customerName,
          agreementType: "Purchase",
          contractNumber: updatedAgreement.contractNumber,
          contractDate: updatedAgreement.contractDate,
          vehicleRegistration: updateData.purchase_details.registrationNumber,
          agreement_id: updatedAgreement._id,
          creatorEmail: req.user.email
        };

        await sendAgreementSignLink(updateData.purchase_details.emailAddress, agreementData, pdfUrl);
        console.log(`Sign link email sent to ${updateData.purchase_details.emailAddress}`);
      }
    } catch (emailError) {
      console.error("Failed to send sign link email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: pdfError 
        ? 'Purchase agreement updated successfully, but PDF upload failed. Please try uploading the PDF again later.' 
        : 'Purchase agreement updated successfully',
      data: {
        ...updatedAgreement.toObject(),
        pdfUrl: pdfUrl
      },
      pdfError: pdfError
    });
  } catch (error) {
    console.error('Error updating purchase agreement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase agreement',
      error: error.message
    });
  }
};

const updateAgencyAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { corp_id, id: user_id } = req.user;
    const updateData = req.body;
    console.log("updateData from frontend updateAgencyAgreement", updateData);

    // Find the existing agreement
    const existingAgreement = await Agreement.findOne({ 
      _id: id, 
      corp_id,
      agreementType: 'Agency'
    });

    if (!existingAgreement) {
      return res.status(404).json({
        success: false,
        message: 'Agency agreement not found or you do not have permission to update it'
      });
    }

    // Validate update data
    if (!updateData.agency_details || !updateData.agency_details.registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update data. Registration number is required.'
      });
    }

    // Update the agreement
    const updatedAgreement = await Agreement.findByIdAndUpdate(
      id, 
      { 
        ...updateData,
        updatedAt: new Date(),
        status: 'Updated'
      }, 
      { 
        new: true,
        runValidators: true
      }
    );

    // Generate new PDF with edit number
    let pdfUrl = null;
    let pdfError = null;
    try {
      console.log("Generating updated agency agreement PDF...");
      const pdfPath = await generateAgencyAgreementPDF(updatedAgreement);
      console.log("Updated PDF generated successfully at:", pdfPath);

      // Get existing PDFs and find the highest edit number
      const existingPDFs = updatedAgreement.documents.filter(doc => 
        doc.type === 'pdf' && doc.name.includes('Agency Agreement')
      );

      // Extract edit numbers from existing PDFs
      const editNumbers = existingPDFs.map(doc => {
        const match = doc.name.match(/\(Edit (\d+)\)/);
        return match ? parseInt(match[1]) : 0;
      });

      // Get the highest edit number, default to 0 if no edits exist
      const highestEditNumber = Math.max(...editNumbers, 0);
      const newEditNumber = highestEditNumber + 1;

      const folderName = `agreements/agency/${corp_id}`;
      const fileName = `agency_agreement_${updatedAgreement._id}_edit-${newEditNumber}_${Date.now()}`;

      const uploadResult = await uploadToCloudinary(
        pdfPath,
        folderName,
        fileName,
        false
      );
      console.log("Updated PDF uploaded to Cloudinary:", uploadResult.url);

      pdfUrl = uploadResult.url;

      // Add PDF to vehicle's media array
      await Vehicle.updateOne(
        { _id: updatedAgreement.vehicle_id },
        {
          $push: {
            media: {
              url: pdfUrl,
              datetime: new Date().toISOString(),
              created_by: user_id,
              referance_resource: updatedAgreement.contractNumber || `agency_agreement_${updatedAgreement._id}`,
            },
          },
        }
      );

      // Append new PDF URL to agreement documents
      await Agreement.updateOne(
        { _id: updatedAgreement._id },
        {
          $push: {
            documents: {
              type: "pdf",
              url: pdfUrl,
              name: `Agency Agreement - ${updatedAgreement.contractNumber} (Edit ${newEditNumber})`,
              uploadedAt: new Date(),
            },
          },
        }
      );
    } catch (error) {
      console.error("PDF generation/upload error:", error);
      pdfError = error.message;
    }

    // Send email notification with sign link for the updated agreement
    try {
      if (pdfUrl) { // Only send email if PDF was successfully uploaded
        const customerName = updateData.customerType === 'Company' 
          ? updateData.organization_detail.corp_name 
          : `${updateData.person_detail.name.givenName} ${updateData.person_detail.name.lastName}`;

        const agreementData = {
          customerName,
          agreementType: "Agency",
          contractNumber: updatedAgreement.contractNumber,
          contractDate: updatedAgreement.contractDate,
          vehicleRegistration: updateData.agency_details.registrationNumber,
          agreement_id: updatedAgreement._id,
          creatorEmail: req.user.email
        };

        await sendAgreementSignLink(updateData.emailAddress, agreementData, pdfUrl);
        console.log(`Sign link email sent to ${updateData.emailAddress}`);
      }
    } catch (emailError) {
      console.error("Failed to send sign link email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: pdfError 
        ? 'Agency agreement updated successfully, but PDF upload failed. Please try uploading the PDF again later.' 
        : 'Agency agreement updated successfully',
      data: {
        ...updatedAgreement.toObject(),
        pdfUrl: pdfUrl
      },
      pdfError: pdfError
    });
  } catch (error) {
    console.error('Error updating agency agreement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agency agreement',
      error: error.message
    });
  }
};

module.exports = {
  getAgreements,
  createSalesAgreement,
  createAgencyAgreement,
  createPurchaseAgreement,
  createReceiptAgreement,
  deleteAgreement,
  bankidSign,
  bankidCollectStatus,
  getAgreementForSigning,
  getAgreementById,
  uploadAgreementDocument,
  updateSalesAgreement,
  updatePurchaseAgreement,
  updateAgencyAgreement,
};
