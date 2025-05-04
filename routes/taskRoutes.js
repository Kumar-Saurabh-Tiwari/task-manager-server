const express = require('express');
const auth = require('../middlewares/auth');
const {
  createTask,
  getUserTasks,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

const router = express.Router();

router.use(auth);

router.post('/', createTask);
router.get('/', getUserTasks);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
