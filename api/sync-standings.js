const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('[ZETASPORTS] Using full Service Account JSON');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      console.log('[ZETASPORTS] Using individual Environment Variables');
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const formattedKey = privateKey && privateKey.includes('\\n') 
        ? privateKey.replace(/\\n/g, '\n') 
        : privateKey;

      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      };
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.error('[ZETASPORTS] Firebase Init Error:', err.message);
  }
}

const db = admin.firestore();
const API_KEY = '30a2305839ef4d86b3771b360d97b669'; // Your Football-Data.org Key
const LEAGUES = ['PL', 'PD', 'SA', 'BL1', 'FL1'];

module.exports = async (req, res) => {
  // Security check (optional: add a secret key to prevent random people from triggering sync)
  // if (req.query.key !== process.env.SYNC_SECRET) return res.status(401).send('Unauthorized');

  const results = { updated: [], errors: [] };

  try {
    for (const league of LEAGUES) {
      try {
        const response = await axios.get(`https://api.football-data.org/v4/competitions/${league}/standings`, {
          headers: { 'X-Auth-Token': API_KEY }
        });

        const table = response.data.standings[0].table.map(row => ({
          position: row.position,
          teamName: row.team.shortName || row.team.name,
          crest: row.team.crest,
          played: row.playedGames,
          won: row.won,
          drawn: row.draw,
          lost: row.lost,
          points: row.points,
          goalDifference: row.goalDifference
        }));

        const leagueData = {
          leagueName: response.data.competition.name,
          table: table,
          updatedAt: new Date().toISOString()
        };

        // Write to Firestore - This is what your Flutter app listens to!
        await db.collection('standings').doc(league).set(leagueData);
        results.updated.push(league);

        // Sleep to respect API rate limits (free tier)
        await new Promise(resolve => setTimeout(resolve, 1200));
        
      } catch (err) {
        results.errors.push({ league, error: err.message });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Standings synchronized to Firestore',
      results
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
