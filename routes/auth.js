const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
  try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
          return res.status(400).json({ error: "Todos los campos son obligatorios" });
      }

      const userSnapshot = await db.collection('users')
          .where('email', '==', email)
          .get();

      if (!userSnapshot.empty) {
          return res.status(400).json({ error: 'El usuario ya existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.collection('users').add({
          email,
          username,
          password: hashedPassword,
          tipo: 2, // Se asigna el tipo 2 automáticamente
          last_login: new Date()
      });

      res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const userData = userSnapshot.docs[0].data();
    const userId = userSnapshot.docs[0].id;

    const validPassword = await bcrypt.compare(password, userData.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await db.collection('users').doc(userId).update({
      last_login: new Date()
    });

    const token = jwt.sign(
      { userId, email: userData.email },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Aquí agregamos `tipo` a la respuesta
    res.json({ 
      token, 
      user: { 
        email: userData.email, 
        username: userData.username, 
        tipo: userData.tipo  // <- Asegúrate de que existe en Firestore
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;