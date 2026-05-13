const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saVar) throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing in Vercel settings.');
    
    const serviceAccount = JSON.parse(saVar);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Initialization Error:', e);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, imageUrl, topic = 'zetasports_all' } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and Body are required' });
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    android: {
      notification: {
        imageUrl: imageUrl,
      },
    },
    apns: {
      payload: {
        aps: {
          'mutable-content': 1,
        },
      },
      fcm_options: {
        image: imageUrl,
      },
    },
    topic: topic,
  };

  try {
    const response = await admin.messaging().send(message);
    return res.status(200).json({ 
      success: true, 
      messageId: response 
    });
  } catch (error) {
    console.error('FCM Error:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification', 
      details: error.message 
    });
  }
};
