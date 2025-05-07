const Task = require('../models/Task');
const { getIO } = require('../socket');

exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.userId });

    const io = getIO();
    io.emit('receive-task-update', task);

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: 'Error creating task', error: err.message });
  }
};
exports.getUserTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [{ createdBy: req.userId }, { assignedTo: req.userId }],
    }).populate('createdBy assignedTo', 'name email');
    res.json(tasks);
  } catch (err) {
    res.status(400).json({ message: 'Error fetching tasks', error: err.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('createdBy assignedTo', 'name email');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: 'Error fetching task', error: err.message });
  }
};


exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: 'Error updating task', error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting task', error: err.message });
  }
};

// controllers/taskController.js
exports.searchTasks = async (req, res) => {
  try {
    const { q, status, priority, dueDate } = req.query;
    const query = {
      $and: [
        {
          $or: [
            { createdBy: req.userId },
            { assignedTo: req.userId }
          ]
        }
      ]
    };

    if (q) {
      query.$and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      });
    }

    if (status) {
      query.$and.push({ status });
    }

    if (priority) {
      query.$and.push({ priority });
    }

    if (dueDate) {
      const start = new Date(dueDate);
      const end = new Date(dueDate);
      end.setHours(23, 59, 59, 999);
      query.$and.push({ dueDate: { $gte: start, $lte: end } });
    }

    const tasks = await Task.find(query).populate('createdBy assignedTo', 'name email');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Error searching tasks', error: err.message });
  }
};

