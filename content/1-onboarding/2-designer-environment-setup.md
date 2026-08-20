# Designer environment setup

## 1. Install Godot 4.6.2

Download and install **Godot 4.6.2 stable** from
[godotengine.org](https://godotengine.org/download). The project uses Godot 4.6.2
features and will not work with older versions.

## 2. Download Github Desktop

Github use will hopefully not be as intensive when it comes to designers so I'm
hoping that [Github Desktop](https://desktop.github.com/download/) satisfies
this requirement

## 2. Clone the Repository

No terminal needed — GitHub Desktop handles it:

1. Open **GitHub Desktop** (sign in with your GitHub account if you haven't already)
2. Go to **File → Clone repository…**
3. Select the **URL** tab
4. Paste `https://github.com/Ashfall-Software/brews-n-battles` into the **URL or username/repository** field
5. Pick a **Local path** where the project will live on your computer
6. Click **Clone**

### Switch to your user branch

The clone starts on `main`, but your work belongs on your personal branch —
the one named after your GitHub username (`azva01`, `tsunderick`, …). To
switch:

1. Click the **Current branch** button in the top toolbar (it will say `main`)
2. Type your username in the search box — your branch appears in the list
3. Click it to switch

> [!tip] Branch not showing up?
> Click **Fetch origin** in the top-right corner, then search again. If it
> still doesn't appear, your branch may not exist yet — ask in the team chat
> and someone will create it for you.

> [!warning] Never commit to `main`
> All your work happens on your personal branch, and it only reaches `main`
> through a Pull Request. See [[x-new-employee-guide|the new employee guide]]
> for the full contributing workflow.

## 3. Install Aseprite & Configure Importality

1. Install [Aseprite](https://www.aseprite.org/) for pixel art and sprite animations
2. In Godot, go to **Editor → Editor Settings → General**
3. Search for **Importality**
4. Set **Aseprite command path** to your Aseprite executable
5. Set **Temp files path** to `/tmp`

# Folder Structure

```
game/
├── addons/                    # Godot plugins
├── assets/                    # Imported game assets
├── scenes/                    # Godot scenes (.tscn)
│   ├── characters/players/   # Player scenes & states
│   ├── characters/npcs/      # NPC scenes & states
│   ├── hud/                  # UI screens (start screen, life bar)
│   ├── objects/              # Tables, drinks, etc.
│   └── stages/               # Level scenes
├── scripts/
│   ├── constants/            # Global constants, Factory, ComponentNames
│   └── shared/               # Reusable components & state machine
└── project.godot             # Main project config
```
