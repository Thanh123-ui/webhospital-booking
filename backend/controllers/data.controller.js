const db = require('../data/db');

exports.getDepartments = (req, res) => {
  res.json(db.mockDepartments);
};

exports.getDoctors = (req, res) => {
  res.json(db.mockDoctors);
};

exports.getSchedules = (req, res) => {
  res.json(db.schedules);
};

exports.rateDoctor = (req, res) => {
  const { apptId, doctorName, rating, comment } = req.body;
  if (!rating) return res.status(400).json({ message: 'Missing rating' });
  
  db.ratingsList.push({
    id: Date.now(),
    apptId,
    doctorName,
    rating: parseInt(rating),
    comment,
    date: new Date().toISOString()
  });

  return res.json({ message: 'Rated successfully' });
};

exports.getTopDoctors = (req, res) => {
  // Compute average ratings
  const aggregated = {};
  db.ratingsList.forEach(r => {
     if (!aggregated[r.doctorName]) { aggregated[r.doctorName] = { sum: 0, count: 0 }; }
     aggregated[r.doctorName].sum += r.rating;
     aggregated[r.doctorName].count += 1;
  });

  const doctorsWithRating = db.mockDoctors.map(doc => {
     const stats = aggregated[doc.name];
     return {
       ...doc,
       avgRating: stats ? (stats.sum / stats.count).toFixed(1) : 5.0,
       reviewCount: stats ? stats.count : 0
     };
  });

  // Sort descending
  doctorsWithRating.sort((a,b) => b.avgRating - a.avgRating);
  res.json(doctorsWithRating);
};
