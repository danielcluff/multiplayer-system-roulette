# System Roulette

A multiplayer game prototype where players take turns spinning a roulette wheel to eliminate system processes. The last player with processes remaining wins!

## Overview

**System Roulette** is a conceptual multiplayer game that simulates a high-stakes "process roulette" scenario. Players sit around a hexagonal table with individual CRT-style monitors, watching a central holographic projector display the current target player's process list. Each turn, players spin a roulette wheel that randomly selects a process to terminate. The game continues until one player runs out of processes, triggering a BSOD (Blue Screen of Death) for the loser.

**Note:** This is a **prototype/experimental project** and is not a fully functional, production-ready game. It serves as a proof-of-concept demonstration of the visual design and core game mechanics.

## Features

- **3D Scene**: Immersive hexagonal table layout with tilted CRT monitors and a central holographic projector
- **Retro Terminal Aesthetic**: DOS/terminal-style UI with scanlines and retro computer graphics
- **Multiplayer Support**: WebSocket-based multiplayer architecture (prototype)
- **Process Roulette**: Spin-based process elimination mechanics
- **Visual Effects**: CRT shader effects, holographic displays, and dynamic lighting

## Tech Stack

### Core Technologies
- **Three.js** (v0.182.0) - 3D graphics and scene rendering
- **WebSockets** (ws v8.19.0) - Real-time multiplayer communication
- **Vite** (v7.3.1) - Build tool and development server

### Architecture
- **Client**: Vanilla JavaScript with ES6 modules
- **Server**: Node.js WebSocket server
- **3D Scene**: Custom Three.js scene with hexagonal table, player screens, and holographic projector

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/danielcluff/multiplayer-system-roulette.git
cd multiplayer-system-roulette
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

**Start both server and client:**
```bash
npm start
```

This will:
- Start the WebSocket server on the default port
- Launch the Vite dev server (typically `http://localhost:5173`)

**Or run separately:**

Start the server:
```bash
npm run server
```

Start the client (in another terminal):
```bash
npm run dev
```

The client will be available at `http://localhost:5173` (or the port Vite assigns).

### Building for Production

```bash
npm run build
```

Built files will be output to the `dist` directory.

## Project Structure

```
multiplayer-system-roulette/
├── client/              # Frontend application
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   │   ├── scene/      # Three.js scene modules
│   │   ├── game.js     # Game logic
│   │   ├── network.js  # WebSocket client
│   │   └── main.js     # Entry point
│   └── index.html      # Main HTML file
├── server/             # WebSocket server
│   └── index.js        # Server entry point
└── shared/             # Shared constants/utilities
```

## Game Mechanics (Prototype)

1. Players join a game session via WebSocket
2. Each player is assigned a set of system processes
3. Players take turns spinning the roulette wheel
4. The wheel randomly selects a process to terminate
5. The game continues until one player has no processes left
6. The losing player sees a BSOD screen

## Known Limitations

- This is a **prototype** - many features may be incomplete or non-functional
- Game logic is simplified and may not handle all edge cases
- Visual design takes priority over gameplay polish
- Not intended for production use

## License

ISC

## Author

Daniel Cluff
