const express = require('express');
const auth = require('../middlewares/auth');
const {
  createTask,
  getUserTasks,
  updateTask,
  deleteTask,
  getTaskById,
  searchTasks,
} = require('../controllers/taskController');

const router = express.Router();

router.use(auth);

router.get('/search',searchTasks);

router.post('/', createTask);
router.get('/', getUserTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
