const db = require('../data/db');

exports.getDepartments = async (req, res) => {
  try {
    const departments = await db.getDepartments();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await db.getDoctors();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const schedules = await db.getSchedules();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.rateDoctor = async (req, res) => {
  try {
    const { apptId, doctorName, rating, comment } = req.body;
    if (!rating) return res.status(400).json({ message: 'Missing rating' });

    await db.addRating({
      id: Date.now(),
      apptId,
      doctorName,
      rating: parseInt(rating),
      comment,
      date: new Date().toISOString()
    });

    return res.json({ message: 'Rated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getTopDoctors = async (req, res) => {
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
        ...doc,
        avgRating: stats ? (stats.sum / stats.count).toFixed(1) : 5.0,
        reviewCount: stats ? stats.count : 0
      };
    });

    // Sort descending
    doctorsWithRating.sort((a, b) => b.avgRating - a.avgRating);
    res.json(doctorsWithRating);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
