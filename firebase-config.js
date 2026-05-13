// ============================================================
//  ZETASPORTS — Firebase Configuration
//  Real Firebase project: zeta-sports
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCxxQUxtEImclVGMWF1FZ84p-0XM9-OGPk",
  authDomain:        "zeta-sports.firebaseapp.com",
  projectId:         "zeta-sports",
  storageBucket:     "zeta-sports.firebasestorage.app",
  messagingSenderId: "500544502674",
  appId:             "1:500544502674:web:d0f19312ef703352b41f4b",
  measurementId:     "G-LY4EQXYFWG",
  // VAPID key for Web Push Notifications (FCM)
  vapidKey:          "BOi-Vgz8bDRemfXVYerJ05crxwciGchEU7WUguKrtcgImsa4ThBoakjaL7hwcaVSu-NCUSCQIVzzIMk0J6isIy0"
};

// ── Firestore Data Schema ─────────────────────────────────────
//
// Collection: matches/{matchId}
//   homeTeam:    string      e.g. "Arsenal"
//   awayTeam:    string      e.g. "Man City"
//   homeTeamCode: string     e.g. "ARS"
//   awayTeamCode: string     e.g. "MCI"
//   homeScore:   number|null
//   awayScore:   number|null
//   status:      "live" | "upcoming" | "finished" | "ht"
//   minute:      string      e.g. "67'"
//   kickoffIST:  string      e.g. "21:30"
//   kickoffDate: string      e.g. "2026-05-12"
//   leagueId:    string      e.g. "EPL"
//   leagueName:  string
//   featured:    boolean
//   servers:     [{label:"Server 1", url:"https://..."}]
//
// Collection: news/{newsId}
//   title, category, imageUrl, articleUrl, publishedAt(Timestamp)
//
// Collection: leagues/{leagueId}
//   name, emoji, country, color
