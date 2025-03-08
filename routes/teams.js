const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticateToken = require('../middleware/auth');

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, members = [] } = req.body; 
    const userId = req.user.userId;

    const uniqueMembers = Array.from(new Set([...members, userId])); 

    const team = await db.collection('teams').add({
      name,
      description,
      members: uniqueMembers, 
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({ id: team.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const teamsQuery = await db.collection('teams')
      .where('members', 'array-contains', userId)
      .get();
    const teams = [];
    for (const doc of teamsQuery.docs) {
      const teamData = doc.data();
      const memberPromises = teamData.members.map(async (memberId) => {
        const userDoc = await db.collection('users').doc(memberId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          return {
            id: memberId,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            role: userData.role
          };
        }
        return null;
      });
      const memberDetails = await Promise.all(memberPromises);
      const validMembers = memberDetails.filter(member => member !== null);
      teams.push({
        id: doc.id,
        name: teamData.name,
        description: teamData.description,
        members: validMembers,
        tags: teamData.tags || [],
        createdAt: teamData.createdAt.toDate(),
        createdBy: teamData.createdBy
      });
    }
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const teamId = req.params.id;
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const teamData = teamDoc.data();
    if (!teamData.members.includes(userId)) {
      return res.status(403).json({ error: 'You are not authorized to view this team' });
    }
    const memberPromises = teamData.members.map(async (memberId) => {
      const userDoc = await db.collection('users').doc(memberId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          id: memberId,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          role: userData.role
        };
      }return null;});
    const memberDetails = await Promise.all(memberPromises);
    const validMembers = memberDetails.filter(member => member !== null);
    const team = {
      id: teamDoc.id,
      name: teamData.name,
      description: teamData.description,
      members: validMembers,
      tags: teamData.tags || [],
      createdAt: teamData.createdAt.toDate(),
      createdBy: teamData.createdBy
    };
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a team
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const teamId = req.params.id;
    const { name, description, members } = req.body;
    
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'At least one team member is required' });
    }
    
    const teamDoc = await db.collection('teams').doc(teamId).get();
    
    if (!teamDoc.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const teamData = teamDoc.data();
    
    if (teamData.createdBy !== userId) {
      return res.status(403).json({ error: 'You are not authorized to update this team' });
    }
    
    await db.collection('teams').doc(teamId).update({
      name,
      description,
      members,
      updatedAt: new Date()
    });
    
    res.status(200).json({ message: 'Team updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// delte a team

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const teamId = req.params.id;
    
    const teamDoc = await db.collection('teams').doc(teamId).get();
    
    if (!teamDoc.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const teamData = teamDoc.data();
    
    if (teamData.createdBy !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this team' });
    }
    
    await db.collection('teams').doc(teamId).delete();
    
    res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/search', authenticateToken, async (req, res) => {
  try {
    const searchQuery = req.query.q;
    
    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const usersRef = db.collection('users');
    const nameSnapshot = await usersRef
      .where('name', '>=', searchQuery)
      .where('name', '<=', searchQuery + '\uf8ff')
      .limit(10)
      .get();
    
    const emailSnapshot = await usersRef
      .where('email', '>=', searchQuery)
      .where('email', '<=', searchQuery + '\uf8ff')
      .limit(10)
      .get();
    
    const users = [];
    const userIds = new Set();
    
    nameSnapshot.forEach(doc => {
      if (!userIds.has(doc.id)) {
        userIds.add(doc.id);
        const userData = doc.data();
        users.push({
          id: doc.id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          role: userData.role
        });
      }
    });
    emailSnapshot.forEach(doc => {
      if (!userIds.has(doc.id)) {
        userIds.add(doc.id);
        const userData = doc.data();
        users.push({
          id: doc.id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          role: userData.role
        });
      }
    });
    
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const teamId = req.params.id;

    const teamDoc = await db.collection('teams').doc(teamId).get();

    if (!teamDoc.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const teamData = teamDoc.data();

    if (!teamData.members.includes(userId)) {
      return res.status(403).json({ error: 'You are not authorized to view the members of this team' });
    }

    const memberPromises = teamData.members.map(async (memberId) => {
      const userDoc = await db.collection('users').doc(memberId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          id: memberId,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          role: userData.role
        };
      }
      return null;
    });
    const members = (await Promise.all(memberPromises)).filter(member => member !== null);
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;