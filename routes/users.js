const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
      const usersSnapshot = await db.collection('users').get();
      
      if (usersSnapshot.empty) {
        return res.status(404).json({ error: 'No hay usuarios registrados' });
      }
  
      const users = usersSnapshot.docs.map(doc => {
        const userData = doc.data();
        const { password, ...userWithoutPassword } = userData; 
        return { id: doc.id, ...userWithoutPassword };
      });
  
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  
router.get('/obtener/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.params.id;
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userData = userDoc.data();
      const { password, ...userWithoutPassword } = userData;
      
      res.status(200).json({ id: userId, ...userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Crear un nuevo usuario
  router.post('/create', authenticateToken, async (req, res) => {
    try {
      const { username, email, password, tipo } = req.body;
      
      // Validaciones básicas
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Se requiere username, email y password' });
      }
      
      const emailCheckSnapshot = await db.collection('users')
        .where('email', '==', email)
        .get();
      
      if (!emailCheckSnapshot.empty) {
        return res.status(400).json({ error: 'Este email ya está registrado' });
      }
      
      const usernameCheckSnapshot = await db.collection('users')
        .where('username', '==', username)
        .get();
      
      if (!usernameCheckSnapshot.empty) {
        return res.status(400).json({ error: 'Este nombre de usuario ya está en uso' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = {
        username,
        email,
        password: hashedPassword,
        tipo: tipo || 2, // Por defecto es usuario regular
        last_login: new Date().toISOString()
      };
      
      const userRef = await db.collection('users').add(newUser);
      
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({ id: userRef.id, ...userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.put('/update/:id', authenticateToken,  async (req, res) => {
    try {
      const userId = req.params.id;
      const { username, email, password, tipo } = req.body;
      
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const updateData = {};
      
      if (username) {
        if (username !== userDoc.data().username) {
          const usernameCheckSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();
          
          if (!usernameCheckSnapshot.empty) {
            return res.status(400).json({ error: 'Este nombre de usuario ya está en uso' });
          }
        }
        updateData.username = username;
      }
      
      if (email) {
        if (email !== userDoc.data().email) {
          const emailCheckSnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();
          
          if (!emailCheckSnapshot.empty) {
            return res.status(400).json({ error: 'Este email ya está registrado' });
          }
        }
        updateData.email = email;
      }
      
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      if (tipo !== undefined) {
        updateData.tipo = tipo;
      }
      
      await db.collection('users').doc(userId).update(updateData);
      
      const updatedUserDoc = await db.collection('users').doc(userId).get();
      const updatedUserData = updatedUserDoc.data();
      
      const { password: _, ...userWithoutPassword } = updatedUserData;
      
      res.status(200).json({ id: userId, ...userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Eliminar un usuario
  router.delete('/delete/:id', authenticateToken,  async (req, res) => {
    try {
      const userId = req.params.id;
      const adminId = req.user.userId;
      
      if (userId === adminId) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      }
      
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      await db.collection('users').doc(userId).delete();
      
      res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  module.exports = router;
  