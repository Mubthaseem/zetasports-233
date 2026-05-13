const admin = require('firebase-admin');
const axios = require('axios');

// 1. Download your service account key from Firebase Console -> Project Settings -> Service Accounts
// 2. Save it as serviceAccountKey.json in the same folder as this script.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// CONFIG
const FOOTBALL_DATA_API_KEY = 'YOUR_FOOTBALL_DATA_API_KEY';
const LEAGUES = ['PL', 'PD', 'SA', 'BL1', 'FL1'];

async function fetchAndSync() {
  const allData = {};
  
  for (const league of LEAGUES) {
    try {
      console.log(`Fetching ${league}...`);
      const response = await axios.get(`https://api.football-data.org/v4/competitions/${league}/standings`, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
      });
      
      const table = response.data.standings[0].table.map(row => ({
        position: row.position,
        teamName: row.team.name,
        crest: row.team.crest,
        played: row.playedGames,
        won: row.won,
        drawn: row.draw,
        lost: row.lost,
        points: row.points,
        goalDifference: row.goalDifference
      }));
      
      allData[league] = {
        name: response.data.competition.name,
        table: table,
        updatedAt: new Date().toISOString()
      };
      
      // Update individual league doc in Firestore
      await db.collection('standings').doc(league).set(allData[league]);
      
    } catch (error) {
      console.error(`Error fetching ${league}:`, error.message);
    }
    // Sleep to avoid rate limits (if using free tier)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Sync Complete!');
  process.exit(0);
}

fetchAndSync();
