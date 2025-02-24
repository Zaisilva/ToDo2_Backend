const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticateToken = require('../middleware/auth');

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { 
      nameTask, 
      description, 
      deadline, 
      status, 
      category, 
      assignedUserId, 
      groupId 
    } = req.body;
    
    const userId = req.user.userId; 

    const task = await db.collection('tasks').add({
      userId, 
      nameTask,
      description,
      deadline,
      status,
      category,
      assignedUserId, 
      groupId, 
      createdAt: new Date()
    });

    res.status(201).json({ id: task.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/list/:groupId', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const tasksSnapshot = await db.collection('tasks')
      .where('groupId', '==', groupId)
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

// Ruta para actualizar una tarea existente
router.put('/actualizar/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;
    const { nameTask, description, deadline, status, category } = req.body;
    
    // Verificar que la tarea pertenece al usuario
    const taskRef = db.collection('tasks').doc(taskId);
    const task = await taskRef.get();
    
    if (!task.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    if (task.data().userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta tarea' });
    }
    
    // Actualizar la tarea
    await taskRef.update({
      nameTask,
      description,
      deadline,
      status,
      category,
      updatedAt: new Date()
    });
    
    res.json({ success: true, message: 'Tarea actualizada correctamente' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para eliminar una tarea
router.delete('/eliminar/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;
    
    // Verificar que la tarea pertenece al usuario
    const taskRef = db.collection('tasks').doc(taskId);
    const task = await taskRef.get();
    
    if (!task.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    if (task.data().userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta tarea' });
    }
    
    // Eliminar la tarea
    await taskRef.delete();
    
    res.json({ success: true, message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;