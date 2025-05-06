
const User = require('../models/User');


exports.searchUsers = async (req, res) => {
    const { query } = req.query;
  
    try {
      const regex = new RegExp(query, 'i'); // Case-insensitive partial match
      const users = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select('_id name email');
  
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };