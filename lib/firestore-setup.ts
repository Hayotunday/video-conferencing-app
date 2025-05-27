// This file contains the index configuration for Firestore
// You can use this as reference when setting up indexes manually

export const REQUIRED_INDEXES = [
  {
    collectionGroup: "meetings",
    fields: [
      { fieldPath: "participants", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
]

// Instructions for manual index creation:
// 1. Go to Firebase Console
// 2. Navigate to Firestore Database
// 3. Click on "Indexes" tab
// 4. Click "Create Index"
// 5. Set Collection ID: meetings
// 6. Add fields:
//    - participants (Arrays)
//    - createdAt (Descending)
// 7. Click "Create"
