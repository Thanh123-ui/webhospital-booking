const db = require('../data/db');
const { AppError, sendSuccess, toAppError } = require('../utils/http');
const { getLogs } = require('../utils/logger');

function sanitizeDoctor(doctor) {
  if (!doctor) return doctor;
  const { password, username, ...doctorWithoutSecrets } = doctor;
  return doctorWithoutSecrets;
}

exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await db.getDepartments();
    sendSuccess(res, departments);
  } catch (err) {
    next(toAppError(err));
  }
};

exports.getDoctors = async (req, res, next) => {
  try {
    const doctors = await db.getDoctors();
    sendSuccess(res, doctors.map(sanitizeDoctor));
  } catch (err) {
    next(toAppError(err));
  }
};

exports.getSchedules = async (req, res, next) => {
  try {
    const schedules = await db.getSchedules();
    sendSuccess(res, schedules);
  } catch (err) {
    next(toAppError(err));
  }
};

exports.rateDoctor = async (req, res, next) => {
  try {
    const { apptId, doctorName, rating, comment } = req.body;
    if (!rating) throw new AppError('Missing rating', 400);

    await db.addRating({
      id: Date.now(),
      apptId,
      doctorName,
      rating: parseInt(rating),
      comment,
      date: new Date().toISOString()
    });

    return sendSuccess(res, null, 'Rated successfully');
  } catch (err) {
    next(toAppError(err));
  }
};

exports.getTopDoctors = async (req, res, next) => {
  try {
    const [doctors, ratings] = await Promise.all([db.getDoctors(), db.getRatings()]);

    // Compute average ratings
    const aggregated = {};
    ratings.forEach(r => {
      if (!aggregated[r.doctorName]) { aggregated[r.doctorName] = { sum: 0, count: 0 }; }
      aggregated[r.doctorName].sum += r.rating;
      aggregated[r.doctorName].count += 1;
    });

    const doctorsWithRating = doctors.map(doc => {
      const stats = aggregated[doc.name];
      return {
        ...sanitizeDoctor(doc),
        avgRating: stats ? (stats.sum / stats.count).toFixed(1) : 5.0,
        reviewCount: stats ? stats.count : 0
      };
    });

    // Sort descending
    doctorsWithRating.sort((a, b) => b.avgRating - a.avgRating);
    sendSuccess(res, doctorsWithRating);
  } catch (err) {
    next(toAppError(err));
  }
};

exports.getSystemLogs = (req, res) => {
  return sendSuccess(res, getLogs());
};
