const asyncHandler = require("express-async-handler");
const { getVehicleFromAPI } = require("../services/vehicleService");
const { Vehicle } = require("../models/vehicleModel");
const { generateId } = require("../utils/generateIdUtil");
const Agreement = require("../models/agreementModel");
const multer = require("multer");
const path = require("path");
const { uploadToCloudinary } = require("../utils/cloudinaryUtil");
const fs = require("fs");

const createVehicle = asyncHandler(async (req, res) => {
  try {
    const { vehicleId } = req.body;
    const { corp_id, id: user_id } = req.user;
    if (!vehicleId) {
      return res
        .status(400)
        .json({ success: false, message: "vehicleId is required" });
    }

    // Check if already exists
    let exists = await Vehicle.findOne({ legalId: vehicleId, corp_id });
    if (exists) return res.status(200).json({ success: true, data: exists });

    const vehicleDetails = await getVehicleFromAPI(vehicleId);
    if (!vehicleDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    // Save the data in the exact same structure as the API response
    const vehicleData = {
      ...vehicleDetails,
      corp_id,
      created_by: user_id,
      vehicle_id: generateId(),
      media: [],
      notes: []
    };
    const vehicle = new Vehicle(vehicleData);
    const created = await vehicle.save();
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("Error creating vehicle:", {
      name: error.name,
      code: error.code,
      message: error.message,
      keyValue: error.keyValue,
    });

    // Handle duplicate key error
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Vehicle with this registration number already exists",
        error: error.keyValue,
      });
    }

    // Other errors
    return res.status(500).json({
      success: false,
      message: "Error creating vehicle",
      error: error.message,
    });
  }
});

// GET ALL: Get all vehicles (summary)
const getAll = asyncHandler(async (req, res) => {
  const { corp_id } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  const {
    searchTerm,
    vehicleType,
    status,
    model,
    year,
    priceFrom,
    priceTo,
    mileageFrom,
    mileageTo,
    yearFrom,
    yearTo,
    lagerFrom,
    lagerTo,
    gearbox,
    drivmedel,
  } = req.query;

  let mongoQuery = { corp_id };

  // Simple search
  if (searchTerm) {
    mongoQuery.$or = [
      {
        "registrationData.registrationNumber": {
          $regex: searchTerm,
          $options: "i",
        },
      },
      { "detail.vehicleBrandRaw": { $regex: searchTerm, $options: "i" } },
    ];
  } else {
    // Advanced filters
    if (vehicleType) {
      mongoQuery["detail.vehicleType"] = { $regex: vehicleType, $options: "i" };
    }
    if (status) {
      mongoQuery["status.code"] = status;
    }
    if (model) {
      mongoQuery["detail.vehicleBrandRaw"] = { $regex: model, $options: "i" };
    }
    if (year) {
      mongoQuery["detail.vehicleYear"] = year;
    }

    // Price range filter
    if (priceFrom || priceTo) {
      mongoQuery.price = {};
      if (priceFrom) mongoQuery.price.$gte = parseFloat(priceFrom);
      if (priceTo) mongoQuery.price.$lte = parseFloat(priceTo);
    }

    // Mileage range filter
    if (mileageFrom || mileageTo) {
      mongoQuery.mileage = {};
      if (mileageFrom) mongoQuery.mileage.$gte = parseFloat(mileageFrom);
      if (mileageTo) mongoQuery.mileage.$lte = parseFloat(mileageTo);
    }

    // Year range filter
    if (yearFrom || yearTo) {
      // Ensure we're working with the correct field and handling string years
      mongoQuery["detail.vehicleYear"] = {};

      // Parse years to integers, handling potential string inputs
      const parseYear = (year) => {
        if (!year) return null;
        const parsedYear = parseInt(year, 10);
        return isNaN(parsedYear) ? null : parsedYear;
      };

      const fromYear = parseYear(yearFrom);
      const toYear = parseYear(yearTo);

      // Apply range filtering
      if (fromYear !== null) {
        mongoQuery["detail.vehicleYear"].$gte = fromYear.toString();
      }
      if (toYear !== null) {
        mongoQuery["detail.vehicleYear"].$lte = toYear.toString();
      }

      console.log("Year Filtering Debug:", {
        yearFrom,
        yearTo,
        fromYear,
        toYear,
        mongoQuery: mongoQuery["detail.vehicleYear"],
      });
    }

    // Lagerdagar (days in stock) range filter
    if (lagerFrom || lagerTo) {
      const currentDate = new Date();
      mongoQuery.createdAt = {};
      if (lagerFrom) {
        const minDate = new Date(
          currentDate.getTime() - parseInt(lagerFrom) * 24 * 60 * 60 * 1000
        );
        mongoQuery.createdAt.$lte = minDate;
      }
      if (lagerTo) {
        const maxDate = new Date(
          currentDate.getTime() - parseInt(lagerTo) * 24 * 60 * 60 * 1000
        );
        mongoQuery.createdAt.$gte = maxDate;
      }
    }

    // Gearbox filter
    if (gearbox) {
      mongoQuery.gearbox = gearbox;
    }

    // Fuel type (Drivmedel) filter
    if (drivmedel) {
      mongoQuery["technicalData.fuelCodes"] = {
        $regex: drivmedel,
        $options: "i",
      };
    }
  }

  // Fetch vehicles
  const vehicles = await Vehicle.find(mongoQuery)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean()
    .transform((vehicles) =>
      vehicles.map((vehicle) => ({
        ...vehicle,
        notes: vehicle.notes
          ? vehicle.notes.sort(
              (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
            )
          : [],
        media: vehicle.media
          ? vehicle.media.sort(
              (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
            )
          : [],
      }))
    );

  // Count total vehicles
  const totalItems = await Vehicle.countDocuments(mongoQuery);

  // Count sold vehicles
  const soldVehicles = await Vehicle.countDocuments({
    corp_id,
    "status.code": "SOLD",
  });

  // Calculate average inventory days (simplified)
  const inventoryStats = await Vehicle.find({ corp_id });
  const averageInventoryDays =
    inventoryStats.length > 0
      ? Math.round(
          inventoryStats.reduce((total, vehicle) => {
            const createdDate = new Date(vehicle.createdAt);
            const currentDate = new Date();
            const days = (currentDate - createdDate) / (1000 * 60 * 60 * 24);
            return total + days;
          }, 0) / inventoryStats.length
        )
      : 0;

  // Fetch agreements for these vehicles to enrich media details
  const vehicleIds = vehicles.map((v) => v._id);
  const agreements = await Agreement.find({
    vehicle_id: { $in: vehicleIds },
    corp_id,
  }).select("vehicle_id documents agreementType contractNumber");

  // Enrich media with agreement details
  const vehiclesWithEnrichedMedia = vehicles.map((vehicle) => {
    // Find agreements for this vehicle
    const vehicleAgreements = agreements.filter(
      (agreement) =>
        agreement.vehicle_id.toString() === vehicle._id.toString()
    );

    // Enrich media with additional details from agreements
    const enrichedMedia = (vehicle.media || []).map((mediaItem) => {
      // Find the matching agreement for this media item
      const matchingAgreement = vehicleAgreements.find((agreement) =>
        mediaItem.referance_resource.includes(agreement.contractNumber)
      );

      // If a matching agreement is found, add more details
      if (matchingAgreement) {
        // Try to find the exact document in the agreement
        const matchingDocument = matchingAgreement.documents.find(
          (doc) => doc.url === mediaItem.url
        );

        return {
          ...mediaItem,
          name:
            matchingDocument?.name ||
            `${matchingAgreement.agreementType} Agreement`,
          agreementType: matchingAgreement.agreementType,
          contractNumber: matchingAgreement.contractNumber,
        };
      }

      // If no matching agreement, return the original media item
      return {
        ...mediaItem,
        name: mediaItem.referance_resource,
      };
    });

    return {
      ...vehicle,
      media: enrichedMedia,
    };
  });
  return res.status(200).json({
    success: true,
    data: vehiclesWithEnrichedMedia,
    totalItems,
    currentPage: page,
    totalPages: Math.ceil(totalItems / limit),
    stats: {
      soldVehicles,
      averageInventoryDays,
    },
  });
});

// GET BY ID: Get full vehicle detail
const getById = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  console.log("getById", vehicleId);
  const { corp_id } = req.user;
  if (!vehicleId) {
    return res
      .status(400)
      .json({ success: false, message: "vehicleId is required" });
  }

  // Find vehicle with full details
  const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
  if (!vehicle) {
    return res
      .status(404)
      .json({ success: false, message: "Vehicle not found" });
  }

  // Find all agreements related to this vehicle
  const agreements = await Agreement.find({
    vehicle_id: vehicle._id,
    corp_id,
  }).select("documents agreementType contractNumber");

  // Enrich media with additional details from agreements
  const enrichedMedia = (vehicle.media || []).map((mediaItem) => {
    // Find the matching agreement for this media item
    const matchingAgreement = agreements.find((agreement) =>
      mediaItem.referance_resource.includes(agreement.contractNumber)
    );

    // If a matching agreement is found, add more details
    if (matchingAgreement) {
      // Try to find the exact document in the agreement
      const matchingDocument = matchingAgreement.documents.find(
        (doc) => doc.url === mediaItem.url
      );

      return {
        ...mediaItem,
        name:
          matchingDocument?.name ||
          `${matchingAgreement.agreementType} Agreement`,
        agreementType: matchingAgreement.agreementType,
        contractNumber: matchingAgreement.contractNumber,
      };
    }

    // If no matching agreement, return the original media item
    return {
      ...mediaItem,
      name: `Media from ${mediaItem.referance_resource}`,
    };
  });

  // Convert to plain object to allow modifications
  const responseData = vehicle.toObject();
  responseData.media = enrichedMedia;

  // Sort notes by uploadedAt in descending order
  responseData.notes = responseData.notes
    ? responseData.notes.sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )
    : [];

  // Sort media by uploadedAt in descending order
  responseData.media = responseData.media
    ? responseData.media.sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )
    : [];

  return res.status(200).json({
    success: true,
    data: responseData,
  });
});

// DELETE: Delete vehicle by ID
const deleteById = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { corp_id } = req.user;
  if (!vehicleId) {
    return res
      .status(400)
      .json({ success: false, message: "vehicleId is required" });
  }
  const deleted = await Vehicle.findOneAndDelete({ vehicleId, corp_id });
  if (!deleted) {
    return res
      .status(404)
      .json({
        success: false,
        message: "Vehicle not found or already deleted",
      });
  }
  return res.status(200).json({ success: true, message: "Vehicle deleted" });
});

// NEW: Search vehicle by registration number without creating
const searchVehicleByRegistration = asyncHandler(async (req, res) => {
  let { registrationNumber } = req.query;
  registrationNumber = registrationNumber?.toUpperCase();
  if (!registrationNumber) {
    return res.status(400).json({
      success: false,
      message: "Registration number is required",
    });
  }

  try {
    // First, check if vehicle already exists in our database
    const existingVehicle = await Vehicle.findOne({
      "registrationData.registrationNumber": registrationNumber,
    });

    if (existingVehicle) {
      return res.status(200).json({
        success: true,
        data: existingVehicle,
      });
    }

    // If not in database, search
    const vehicleDetails = await getVehicleFromAPI(registrationNumber);

    if (!vehicleDetails) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Check if registration numbers match
    if (
      vehicleDetails.registrationData?.registrationNumber !== registrationNumber
    ) {
      return res.status(404).json({
        success: false,
        message: "Exact vehicle match not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: vehicleDetails,
    });
  } catch (error) {
    console.error("Vehicle search error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during vehicle search",
    });
  }
});

// Configure multer for document upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Allowed types: PDF, JPEG, PNG, DOC, DOCX"
        ),
        false
      );
    }
  },
});

// Upload document for a vehicle
const uploadVehicleDocument = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { corp_id, id: user_id } = req.user;

  console.log("Upload request received:", {
    vehicleId,
    corp_id,
    user_id,
    fileExists: !!req.file,
    fileDetails: req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferLength: req.file.buffer ? req.file.buffer.length : "No buffer",
        }
      : "No file",
  });

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No document uploaded",
    });
  }

  try {
    // Find vehicle
    const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Create a temporary file from buffer
    const tempDir = path.join(__dirname, "..", "..", "uploads", "temp");
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(
      tempDir,
      `vehicle_doc_${vehicleId}_${Date.now()}${path.extname(
        req.file.originalname
      )}`
    );

    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, req.file.buffer);

    console.log("Temporary file created:", {
      tempFilePath,
      fileExists: fs.existsSync(tempFilePath),
      fileSize: fs.statSync(tempFilePath).size,
    });

    // Upload to Cloudinary
    const folderName = `vehicles/documents/${corp_id}`;
    const fileName = `document_${vehicleId}_${Date.now()}`;

    const uploadResult = await uploadToCloudinary(
      tempFilePath,
      folderName,
      fileName,
      false // Keep local file for debugging
    );

    // Prepare document entry with robust defaults
    const documentEntry = {
      name: req.file.originalname || "Unnamed Document",
      url: uploadResult.url,
      type: req.file.mimetype,
      size: req.file.size,
      uploadedBy: user_id,
      uploadedAt: new Date(),
      datetime: new Date().toISOString(),
      created_by: user_id,
      referance_resource: `Vehicle ${vehicleId} Document`,
    };

    // Ensure media array exists
    vehicle.media = vehicle.media || [];

    // Add document to vehicle's media array
    vehicle.media.push(documentEntry);

    // Save vehicle with validation
    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      document: documentEntry,
      media: vehicle.media
        ? vehicle.media.sort(
            (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
          )
        : [],
    });
  } catch (error) {
    console.error("Vehicle document upload error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return res.status(500).json({
      success: false,
      message: "Error uploading document",
      error: error.message,
    });
  }
});

// Upload note for a vehicle
const uploadVehicleNote = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { corp_id, id: user_id } = req.user;
  const { content, title, isPrivate } = req.body;

  console.log("request", req.body);

  // Validate input
  if (!content) {
    return res.status(400).json({
      success: false,
      message: "Note content is required",
    });
  }

  try {
    // Find vehicle
    const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Prepare note entry
    const noteEntry = {
      content,
      title: title || "Untitled Note",
      uploadedBy: user_id,
      uploadedAt: new Date(),
      lastModified: new Date(),
      isPrivate: isPrivate || false,
      referance_resource: `Vehicle ${vehicleId} Note`,
    };

    // Ensure notes array exists
    vehicle.notes = vehicle.notes || [];

    // Add note to the BEGINNING of vehicle's notes array
    vehicle.notes.unshift(noteEntry);

    // Save vehicle with validation
    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: "Note uploaded successfully",
      note: noteEntry,
      notes: vehicle.notes, // Return the entire updated notes array
    });
  } catch (error) {
    console.error("Vehicle note upload error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return res.status(500).json({
      success: false,
      message: "Error uploading note",
      error: error.message,
    });
  }
});

// Add Outlay
const addOutlay = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { corp_id } = req.user;
  const outlayData = req.body;

  const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
  if (!vehicle) {
    return res.status(404).json({ success: false, message: "Vehicle not found" });
  }

  vehicle.outlay.push(outlayData);
  await vehicle.save();

  return res.status(201).json({ success: true, data: outlayData });
});

// Get All Outlays
const getAllOutlays = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { corp_id } = req.user;

  const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
  if (!vehicle) {
    return res.status(404).json({ success: false, message: "Vehicle not found" });
  }

  return res.status(200).json({ success: true, data: vehicle.outlay });
});

// Update Outlay
const updateOutlay = asyncHandler(async (req, res) => {
  const { vehicleId, outlayId } = req.params;
  const { corp_id } = req.user;
  const updatedData = req.body;

  const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
  if (!vehicle) {
    return res.status(404).json({ success: false, message: "Vehicle not found" });
  }

  const outlayIndex = vehicle.outlay.findIndex(outlay => outlay._id.toString() === outlayId);
  if (outlayIndex === -1) {
    return res.status(404).json({ success: false, message: "Outlay not found" });
  }

  vehicle.outlay[outlayIndex] = { ...vehicle.outlay[outlayIndex], ...updatedData };
  await vehicle.save();

  return res.status(200).json({ success: true, data: vehicle.outlay[outlayIndex] });
});

// Delete Outlay
const deleteOutlay = asyncHandler(async (req, res) => {
  const { vehicleId, outlayId } = req.params;
  const { corp_id } = req.user;

  const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
  if (!vehicle) {
    return res.status(404).json({ success: false, message: "Vehicle not found" });
  }

  vehicle.outlay = vehicle.outlay.filter(outlay => outlay._id.toString() !== outlayId);
  await vehicle.save();

  return res.status(200).json({ success: true, message: "Outlay deleted" });
});

// Update Note
const updateVehicleNote = asyncHandler(async (req, res) => {
  const { vehicleId, noteId } = req.params;
  const { corp_id } = req.user;
  const { content, title, isPrivate } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Note content is required' });
  }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  const note = vehicle.notes.id(noteId);
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  note.content = content;
  note.title = title || note.title;
  note.isPrivate = isPrivate !== undefined ? isPrivate : note.isPrivate;
  note.lastModified = new Date();

  await vehicle.save();
  return res.status(200).json({ success: true, note });
});

// Delete Note
const deleteVehicleNote = asyncHandler(async (req, res) => {
  const { vehicleId, noteId } = req.params;
  const { corp_id } = req.user;

  const vehicle = await Vehicle.findOne({ _id: vehicleId, corp_id });
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  const noteIndex = vehicle.notes.findIndex(n => n._id.toString() === noteId);
  if (noteIndex === -1) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  vehicle.notes.splice(noteIndex, 1);
  await vehicle.save();
  return res.status(200).json({ success: true, message: 'Note deleted' });
});

module.exports = {
  createVehicle,
  getAll,
  getById,
  deleteById,
  searchVehicleByRegistration,
  uploadVehicleDocument,
  uploadVehicleNote,
  addOutlay,
  getAllOutlays,
  updateOutlay,
  deleteOutlay,
  updateVehicleNote,
  deleteVehicleNote,
};
