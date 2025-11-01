# Fryzen

A fast-paced, twin joystick shoot 'em up game where you control a diamond-shaped ship battling enemies and collecting power-ups. Implemented in multiple languages for cross-platform fun.

## Description

Fryzen is an action-packed game inspired by classic arcade shooters. Pilot your ship through waves of enemies, shoot bullets in different modes, and survive as long as possible. The game features smooth controls, particle effects, and responsive design for both desktop and mobile.

## Features

- **Shoot Modes**: Rapid fire, blast (spread), and barrage (fast, inaccurate).
- **Power-Ups**: Collect blue orbs to increase score and occasionally gain lives.
- **Enemies**: Basic hexagon enemies and charger variants with AI.
- **Ultimate Ability**: Circular bullet burst when score allows.
- **Save/Load**: Desktop version supports saving/loading game state.
- **Responsive Design**: Optimized for desktop, mobile, and touch devices.
- **Audio**: Simple beep sounds for feedback.
- **Debug Mode**: Toggle with F1 for development (shows entity count and hitboxes).

## How to Play

Navigate your ship, shoot enemies, and avoid collisions. Gain score by defeating enemies and collecting pickups. Levels increase difficulty with more enemies.

Play the web version directly in your browser: [https://fryzen.netlify.app]

### Desktop Controls

| Action          | Key/Button                  | Description |
|-----------------|-----------------------------|-------------|
| Move            | W/A/S/D                     | Move ship up/left/down/right |
| Shoot           | Arrow Keys (Up/Down/Left/Right) or Left Mouse Click | Aim and shoot in direction; smoothed for keyboard |
| Change Mode     | Tab or Right Mouse Click    | Cycle through Rapid/Blast/Barrage modes |
| Ultimate        | Q or Middle Mouse Click     | Circular bullet burst (costs 20 score) |
| Pause           | P                           | Pause/unpause game |
| Restart         | R                           | Restart game |
| Save State      | F2                          | Save current game state to browser storage |
| Load State      | F3                          | Load saved game state |
| Debug Toggle    | F1                          | Show/hide debug info |

### Mobile/Touch Controls

- **Movement**: Left virtual joystick.
- **Shooting**: Right virtual joystick or arrow buttons.
- **Change Mode**: "Change Mode" button (cycles modes).
- **Ultimate**: "ULT" button (circular burst).
- **HUD**: Score, lives, level displayed in controls area.
- **Touch Hints**: Buttons show current mode and controls.

## Project Inspiration

Inspired by twin joystick shooter game like Geometry Wars and [Pew Pew Live](https://github.com/pewpewlive).And browser game named [CyberRunner](https://github.com/Luka12-dev/CyberRunner). Built as an experiment in game development across multiple programming languages, focusing on simple mechanics, smooth controls, and retro aesthetics.

## Technologies Used

- **JavaScript/HTML5 Canvas**: Core web implementation with responsive design.
- **CSS**: Styling with dark theme and animations.
- **Python/Pygame**: Desktop version with Pygame library.
- **Audio**: Web Audio API for beeps.

## Game Mechanics

- **Player**: Diamond-shaped ship with rotation based on movement.
- **Bullets**: Player bullets are yellow, enemy bullets are red.
- **Enemies**: Spawn from screen edges, pursue player when close.
- **Pickups**: Blue ellipses that give score; rare chance for extra life.
- **Levels**: Increase every 40 + (level*30) score; adds max enemies and spawns pickups.
- **Collision**: Player loses life on enemy contact or enemy bullets; enemies die on player bullets.
- **Scoring**: 12 per enemy kill, 4 per pickup.

## Tips

- Use Rapid for quick shots, Blast for crowds, Barrage for conserving score.
- Mouse shooting is instant; keyboard shooting smooths direction.
- Save state (F2) to resume later.
- On mobile, use joysticks for precise control.

## License

MIT
This project is open-source. Feel free to modify and distribute.

## Credits

Created with passion for Twin Joystick Shooter Game. Inspired by [Pew Pew Live](https://github.com/pewpewlive) & Geometry Wars.
