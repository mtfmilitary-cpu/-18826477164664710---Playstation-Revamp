<div align="center">

# 🎮 PlayStation Web Experience Revamp

![PlayStation Banner](https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=1200&h=300&fit=crop)

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-0070D1?style=for-the-badge)](https://playstation-revamp.vercel.app/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

**A stunning, fan-made recreation of the PlayStation 5 Console experience — reimagined for the modern web with cutting-edge technologies and immersive interactions.**

[✨ Features](#-features) • [🎯 Demo](#-live-demo) • [🚀 Quick Start](#-quick-start) • [🛠️ Tech Stack](#️-tech-stack) • [📱 Mobile Controller](#-mobile-controller-interface) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

Experience the PlayStation 5 interface like never before — fully recreated in a browser. This project is a comprehensive reimagination combining authentic PS5 aesthetics with modern web technologies, featuring real-time controller sync, 3D graphics, cinematic animations, and a complete dashboard ecosystem.

### 🎯 Live Demo

**🌐 [https://playstation-revamp.vercel.app/](https://playstation-revamp.vercel.app/)**

> **Tip:** For the best experience, open the demo on a desktop browser and scan the QR code with your mobile device to use it as a controller!

---

## ✨ Features

### 🎮 **Core Experience**

<table>
<tr>
<td width="50%">

#### 🏠 **Dynamic Home Dashboard**
- PS5-authentic game library browsing
- Cinematic background transitions
- Featured games carousel
- Recently played games section
- Real-time friend status & achievements
- Personalized game recommendations

</td>
<td width="50%">

#### 🎨 **Immersive UI/UX**
- Authentic PS5 visual design language
- Butter-smooth GSAP animations
- Custom PlayStation cursor
- Cinematic video preloader
- Responsive across all devices
- Horizontal navigation patterns

</td>
</tr>
<tr>
<td width="50%">

#### 🕹️ **3D Controller Showcase**
- Interactive 3D DualSense model
- Real-time controller reactions
- WebGL rendering with React Three Fiber
- Physics-based animations
- Dynamic lighting effects
- Hardware accessories carousel

</td>
<td width="50%">

#### 📱 **Mobile Controller Interface**
- QR code pairing system
- WebSocket real-time communication
- Touch-based virtual controls
- Haptic feedback support
- D-pad & action buttons
- Analog joystick simulation

</td>
</tr>
</table>

### 📑 **Complete Dashboard Pages**

| Page | Description |
|------|-------------|
| **🏠 Home** | Main dashboard with featured games, friends, and personalized content |
| **🎮 Library** | Full game library with grid/list views and search functionality |
| **🛍️ Store** | PlayStation Store recreation with game browsing and details |
| **📺 Media** | Media gallery and streaming interface |
| **🎯 Subscriptions** | PlayStation Plus subscription management UI |
| **👤 Profile** | User profile with stats, trophies, and achievements |
| **🎪 Accessories** | Hardware showcase with 3D controller and product carousel |

### 🎭 **Additional Features**

- ✅ **Multi-section Navigation** — Seamless routing with React Router
- ✅ **Live Friends Panel** — Real-time online status indicators
- ✅ **Achievement System** — Trophy showcase with rarity indicators
- ✅ **Statistics Dashboard** — Gaming stats with visual charts
- ✅ **Payment Modal** — Checkout UI for store purchases
- ✅ **Session Management** — Unique session IDs for multi-device sync
- ✅ **Custom Animations** — GSAP & Framer Motion throughout
- ✅ **Responsive Design** — Works flawlessly on mobile, tablet, and desktop

---

## 🛠️ Tech Stack

### **Frontend Framework**
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?style=flat-square&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7.13.1-CA4245?style=flat-square&logo=react-router&logoColor=white)

### **Styling & Animation**
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2.1-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.14.2-88CE02?style=flat-square&logo=greensock&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.34.3-0055FF?style=flat-square&logo=framer&logoColor=white)

### **3D Graphics**
![Three.js](https://img.shields.io/badge/Three.js-0.183.1-000000?style=flat-square&logo=three.js&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/R3F-9.5.0-000000?style=flat-square&logo=three.js&logoColor=white)
![Drei](https://img.shields.io/badge/Drei-10.7.7-000000?style=flat-square&logo=three.js&logoColor=white)

### **Backend & Real-time**
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-8.19.0-010101?style=flat-square&logo=socket.io&logoColor=white)

### **UI Components**
![Lucide Icons](https://img.shields.io/badge/Lucide_Icons-Latest-F56565?style=flat-square)
![QR Code React](https://img.shields.io/badge/QR_Code-4.2.0-2E7D32?style=flat-square)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/Manav-Sonawane/Playstation-Revamp.git

# Navigate to project directory
cd Playstation-Revamp

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Start production server (with WebSocket support)
npm start
```

### Environment Setup

The project uses WebSockets for real-time controller communication. The server automatically detects the protocol (ws/wss) based on your deployment environment.

---

## 📱 Mobile Controller Interface

One of the standout features is the **mobile controller integration**:

### How It Works

1. **Open the main app** on your desktop/laptop
2. **Navigate to the Accessories page** (or scan QR code from home)
3. **Scan the QR code** with your mobile device
4. **Use your phone as a controller** with real-time button feedback
5. **Watch the 3D DualSense react** to your inputs in real-time

### Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│   Desktop App   │ ◄─────────────────────────► │   Mobile App    │
│  (3D Display)   │    Session-based Sync       │  (Controller)   │
└─────────────────┘                              └─────────────────┘
        │                                                  │
        └──────────────────────┬───────────────────────────┘
                               │
                        ┌──────▼──────┐
                        │  WebSocket  │
                        │   Server    │
                        │  (Node.js)  │
                        └─────────────┘
```

### Controller Features
- **D-Pad Navigation** — Left, Right, Up, Down
- **Action Buttons** — Cross, Circle, Triangle, Square
- **Triggers** — L1, L2, R1, R2
- **Analog Joystick** — 360° movement detection
- **Haptic Feedback** — Vibration patterns on button press
- **Real-time Sync** — Zero-latency input transmission

---

## 📁 Project Structure

```
Playstation-Revamp/
├── public/                      # Static assets
│   ├── ps5_controller.glb      # 3D controller model
│   ├── preloader.mp4           # Loading animation
│   ├── store-logos/            # Game logo images
│   └── store-banners/          # Game banner images
├── src/
│   ├── Components/              # React components
│   │   ├── Anikator/           # Controller-related components
│   │   │   ├── ControllerDashboard.jsx
│   │   │   ├── ControllerInterface.jsx   # Mobile controller UI
│   │   │   ├── DualSenseModel.jsx        # 3D controller
│   │   │   ├── HardwareStore.jsx
│   │   │   ├── Joystick.jsx
│   │   │   ├── VirtualCursor.jsx
│   │   │   └── useDualSenseWS.js         # WebSocket hook
│   │   ├── Achievements.jsx
│   │   ├── ContinuePlaying.jsx
│   │   ├── FriendsPanel.jsx
│   │   ├── GameLibrary.jsx
│   │   ├── GlobalNavbar.jsx
│   │   ├── HeroBanner.jsx
│   │   ├── HomeDashboard.jsx
│   │   ├── Layout.jsx
│   │   ├── MediaUI.jsx
│   │   ├── Navbar.jsx
│   │   ├── PaymentModal.jsx
│   │   ├── Preloader.jsx
│   │   ├── Profile.jsx
│   │   ├── Statistics.jsx
│   │   ├── StoreUI.jsx
│   │   └── SubscriptionsPage.jsx
│   ├── data/
│   │   └── mockData.js         # Game & user data
│   ├── assets/                 # Additional assets
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── server.js                   # WebSocket server
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 🎨 Design Highlights

### Color Palette
- **Primary Blue**: `#0070D1` (PlayStation Brand)
- **Dark Background**: `#0a0e18` → `#0d1220` (Gradient)
- **Accent Colors**: Dynamic per-game (extracted from posters)
- **Text**: White with varying opacity levels

### Typography
- **Primary Font**: Inter, -apple-system, sans-serif
- **PlayStation Font**: Custom PS font for branding

### Animations
- **Page Transitions**: Smooth fade & slide with Framer Motion
- **Button Interactions**: Scale & glow effects with GSAP
- **3D Controller**: Physics-based reactions to input
- **Background**: Cinematic poster scaling on game selection

---

## 🔧 Configuration

### Vite Configuration
The project uses Vite for fast development and optimized builds with React plugin support.

### Tailwind Configuration
Custom Tailwind setup with modern v4 syntax using `@tailwindcss/vite` plugin.

### ESLint Configuration
Configured with React-specific rules for code quality and consistency.

---

## 🌐 Deployment

This project is deployed on **Vercel** with automatic deployments from the main branch.

### Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Manav-Sonawane/Playstation-Revamp)

### Manual Deployment

```bash
# Build the project
npm run build

# The dist/ folder contains the production build
# Deploy dist/ to your preferred hosting platform
```

### WebSocket Configuration
For WebSocket support in production, ensure your hosting platform supports WebSocket upgrades. The server automatically handles both HTTP and WebSocket connections on the same port.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve this project:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Ensure all animations are smooth (60fps)
- Test on multiple devices and browsers
- Add comments for complex logic
- Keep components modular and reusable

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

This project is a **non-commercial, open-source fan project** created for educational and portfolio purposes. It is **not affiliated with, endorsed by, or connected to Sony Interactive Entertainment** in any way. All PlayStation trademarks, logos, and brand elements are property of Sony Interactive Entertainment LLC.

This is an experimental web development showcase demonstrating advanced UI/UX implementation and is not intended for commercial use.

---

## 👨‍💻 Author

**Manav Sonawane**

[![GitHub](https://img.shields.io/badge/GitHub-Manav--Sonawane-181717?style=flat-square&logo=github)](https://github.com/Manav-Sonawane)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-0070D1?style=flat-square&logo=google-chrome&logoColor=white)](https://playstation-revamp.vercel.app/)

---

## 🙏 Acknowledgments

- **Sony Interactive Entertainment** — For the original PlayStation 5 design inspiration
- **React Three Fiber Community** — For excellent 3D rendering tools
- **GSAP Team** — For the powerful animation engine
- **Vercel** — For seamless deployment and hosting

---

<div align="center">

### 🌟 If you enjoyed this project, please give it a star!

[![Star on GitHub](https://img.shields.io/github/stars/Manav-Sonawane/Playstation-Revamp?style=social)](https://github.com/Manav-Sonawane/Playstation-Revamp)

**Made with ❤️ and lots of ☕**

</div>

---

## Project #18826477164664710 — Electron + Steam Console

This branch adds a desktop-app foundation while preserving the existing React/Vite interface.

### Run in development

```bash
npm install
npm run electron:dev
```

### Build and run the desktop version

```bash
npm install
npm run desktop
```

### Steam integration in this branch

- The **Library** screen reads installed Steam games from local `appmanifest_*.acf` files and detected Steam library folders.
- **Play** launches a detected installed game through its Steam App ID.
- The **Store** screen uses Steam's public Store search/details endpoints where available and links out to the official Steam page for checkout.
- No Steam password, payment information, or private profile credentials are requested.
- Steam Store endpoints are best-effort and can be throttled or changed; price/details may be unavailable temporarily.

Electron is configured with context isolation, Node integration disabled, a sandboxed preload, and a loopback-only backend. This project is a fan-made interface and is not affiliated with Sony or Valve.


## Peer-to-peer party voice and chat

The desktop party page includes an experimental WebRTC mesh-call panel:
- Microphone audio is sent peer-to-peer using WebRTC media tracks.
- Party text messages use WebRTC data channels when peers are connected.
- The Node server's `/party-ws` WebSocket endpoint relays only room membership and WebRTC offer/answer/ICE signaling; it does not relay voice audio or P2P chat messages.
- STUN is configured for connection discovery. Some routers and mobile networks require a TURN relay, which is not configured by default.

### Current development limits

The Electron app starts its signaling server on `127.0.0.1:3000` for local development. That means other people's computers cannot connect to this signaling endpoint over the internet yet. For real remote parties, deploy the Node signaling backend to a reachable HTTPS/WSS host, configure authentication and party access control, and provide a TURN service for networks where direct peer connections fail. Do not expose the unauthenticated development server directly to the public internet.

This is an experimental mesh design: each participant connects directly to every other participant, so bandwidth and CPU usage grow with party size. It is best suited to small parties until a larger-scale architecture is added. Browser microphone access requires a secure context (Electron localhost or HTTPS) and user permission.


## Steam account profile

The desktop console detects the signed-in local Steam account from Steam's `config/loginusers.vdf`. To request account statistics (avatar, recently played games, owned-game count, total tracked playtime, friends count and Steam level), the backend also needs a Steam Web API key.

- Create/manage a key through Steam's official Web API key page: https://steamcommunity.com/dev/apikey
- Set `STEAM_WEB_API_KEY` in the environment **before** starting the Electron app/backend. For a one-session Windows Command Prompt test, run `set STEAM_WEB_API_KEY=your_key_here` in that terminal, then start the app from the same terminal.
- Optionally set `STEAM_ID64` if local account detection is unavailable. Otherwise, the backend uses the most recently active account in Steam's local login list.
- Never commit the key to GitHub or place it in renderer/frontend code. The server reads it from the environment.
- Steam privacy settings may hide owned games, playtime or friends. Missing fields are shown as unavailable rather than replaced with demo numbers.
- Steam does not provide a single account-wide endpoint for the total number of unlocked achievements across every game. The profile leaves that total unavailable rather than inventing a count; per-game achievement integration can be added separately.
