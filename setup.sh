#!/bin/bash

# Create all folders
mkdir -p assets/icons assets/sounds assets/memes
mkdir -p css js pages mini-games
mkdir -p mini-games/flip-cards mini-games/quick-math mini-games/target-shoot

# Create all files
touch index.html game.html manifest.json sw.js robots.txt
touch assets/logo.png
touch css/style.css css/responsive.css css/game-styles.css
touch js/main.js js/sheets-api.js js/payment.js js/store.js js/game-engine.js js/flip-game.js
touch pages/reels.html pages/store.html pages/leaderboard.html pages/admin.html
touch mini-games/flip-cards/flip-game.html
touch mini-games/quick-math/math-game.html
touch mini-games/target-shoot/shoot-game.html

echo "All folders and files created successfully."