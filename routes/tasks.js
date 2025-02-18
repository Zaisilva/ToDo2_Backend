const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticateToken = require('../middleware/auth');

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { nameTask, description, deadline, status, category } = req.body;
    const userId = req.user.userId;

    const task = await db.collection('tasks').add({
      userId,
      nameTask,
      description,
      deadline,
      status,
      category,
      createdAt: new Date()
    });

    res.status(201).json({ id: task.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tasksSnapshot = await db.collection('tasks')
      .where('userId', '==', userId)
      .get();

    const tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;