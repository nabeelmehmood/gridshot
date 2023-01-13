const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');
admin.initializeApp();

// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started
//

exports.addScore = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const user = req.body && req.body.user;
    if (user.username && user.score) {
      if (usernameRegex.test(user.username)) {
        const writeResult = await admin
          .firestore()
          .collection('UserScores')
          .add(user);
        res.json({
          success: true,
          result: `User with ID: ${writeResult.id} added. With score: ${user.score}`
        });
      } else {
        res.json({
          success: false,
          result:
            'Username must be between 3-12 characters and only contain alpha-numerics'
        });
      }
    } else res.json({ success: false });
  });
});

exports.getTopScores = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const list = await (
      await admin
        .firestore()
        .collection('UserScores')
        .orderBy('score', 'desc')
        .limit(50)
        .get()
    ).docs;
    const users = list.map(item => {
      return {
        score: item.get('score'),
        username: item.get('username'),
        hits: item.get('hits'),
        misses: item.get('misses')
      };
    });
    res.json({ users });
  });
});

const usernameRegex = /^(?=[a-zA-Z0-9._]{3,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/;
