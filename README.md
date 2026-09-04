# ⚖️ AI Legal Comprehensive Platform (ai-legal-comp)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Mobile%20%7C%20Web%20%7C%20API-indigo.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb.svg)]()
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-black.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)]()

Comprehensive, enterprise-grade AI legal assistant platform delivering case intelligence, document analysis, voice-enabled courtroom practice, contract evaluation, and legal workflow automation.

---

## 🏗️ Architecture & Repository Structure

`	ext
ai-legal-comp/
├── AI-Legal_App_frontend-mobile/  # React Native / Expo cross-platform mobile application
├── AI-Legal_App_Webapp/           # React + Vite web client workspace
├── AI-Legal_App_BAckend/          # Express.js REST API with MongoDB & Vertex AI services
├── LICENSE                        # MIT License
└── README.md                      # Platform documentation & setup guide
`

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* **Node.js**: 18.x or 20.x
* **Package Manager**: 
pm or yarn
* **Local Database**: MongoDB running on mongodb://127.0.0.1:27017
* **Mobile Tooling**: Expo CLI (
px expo) or EAS CLI (
pm install -g eas-cli)

---

### 1. Backend Service (AI-Legal_App_BAckend)

The backend connects by default to your local MongoDB instance (mongodb://127.0.0.1:27017/ai-legal).

`ash
cd AI-Legal_App_BAckend
npm install
npm run dev
# Server boots on http://localhost:8080 or configured PORT
`

### 2. Mobile App (AI-Legal_App_frontend-mobile)

The mobile app operates offline or connects to the local backend:

`ash
cd AI-Legal_App_frontend-mobile
npm install
npx expo start
`
* Press  for Android Emulator.
* Press i for iOS Simulator.

### 3. Web Client (AI-Legal_App_Webapp)

`ash
cd AI-Legal_App_Webapp
npm install
npm run dev
# Web app runs at http://localhost:5173
`

---

## 🛡️ Stability, Performance & Compliance Optimizations

This repository includes critical architectural patches:
* **Zero Cold-Boot Route Traps**: Neutralized @last_opened_screen routing bug in _layout.tsx to prevent splash screen crash loops.
* **Leak-Free Interval Management**: Custom useFocusInterval hook ensures background polling pauses when screens lose focus and cleans up strictly on unmount.
* **Android Optimization & R8 Shrinking**: Configured ProGuard/R8 rules to reduce DEX footprint from 60 MB to <25 MB and ensure obfuscation scores surpass Play Console thresholds (>50%).
* **Android 15 Edge-to-Edge Compliance**: Eliminated deprecated window and navigation bar color setters in favor of eact-native-safe-area-context.
* **Android 16 Large Screen Support**: Overridden Google ML Kit barcode scanner orientation locks to support foldables and tablets seamlessly.
* **Security & Secret Sanitization**: Removed exposed live API keys and enforced select: false and 	oJSON sanitizers on user password hashes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
