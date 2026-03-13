#!/usr/bin/env python3
"""
DND Quest AI — Automated Playtest Script
Creates a character, starts a game, and plays 5 turns with varied actions.
"""

import json
import sys
import time
import requests

BASE_URL = "http://localhost:3000/api/bot"

# ── Character definition ──────────────────────────────────────────────

CHARACTER = {
    "name": "Zephmir",
    "race": "Tiefling",
    "class": "Rogue",
    "gender": "Female",
    "stats": {
        "STR": 8,
        "DEX": 16,
        "CON": 12,
        "INT": 13,
        "WIS": 10,
        "CHA": 17,
    },
    "avatar": {
        "skinTone": "#C68642",
        "hairColor": "#1a1a2e",
        "hairStyle": "long",
        "bodyBuild": "slim",
        "height": "average",
    },
}

TURNS = [
    "I carefully explore the surroundings, looking for anything unusual.",
    "I approach the nearest NPC and strike up a conversation.",
    "I attempt to blend into the shadows and hide from sight.",
    "I try to persuade someone nearby to share useful information.",
    "I draw my daggers and prepare for combat with the nearest threat.",
]

# ── Helpers ────────────────────────────────────────────────────────────

def post(action: str, payload: dict) -> dict:
    """Send a request to the bot API and return the JSON response."""
    body = {"action": action, **payload}
    try:
        resp = requests.post(BASE_URL, json=body, timeout=60)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Request failed: {e}")
        sys.exit(1)


def print_separator():
    print("─" * 70)


def print_state(state: dict):
    """Print a concise summary of the game state."""
    char = state.get("character", {})
    hp = char.get("hp", {})
    print(f"  HP: {hp.get('current', '?')}/{hp.get('max', '?')}  "
          f"XP: {char.get('xp', '?')}  "
          f"Gold: {char.get('gold', '?')}  "
          f"Location: {state.get('location', '?')}")
    worn = char.get("worn", [])
    if worn:
        print(f"  Worn: {', '.join(worn)}")
    backpack = char.get("backpack", [])
    if backpack:
        print(f"  Backpack: {', '.join(backpack)}")


def print_dm_response(data: dict):
    """Print the DM's narrative and any structured fields."""
    dm = data.get("dmResponse", {})
    narrative = dm.get("narrative", "")
    if narrative:
        # Wrap long narratives
        for line in narrative.split("\n"):
            print(f"  DM: {line}")

    check = data.get("checkRoll")
    if check:
        print(f"  ⚔ Check: {check.get('skill', '?')} "
              f"(DC {check.get('dc', '?')}) — {check.get('description', '')}")

    img = data.get("imagePrompt")
    if img:
        print(f"  🖼 Scene: {img[:80]}{'…' if len(img) > 80 else ''}")


# ── Main playtest flow ────────────────────────────────────────────────

def main():
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║           DND Quest AI — Automated Playtest                        ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    print()

    results = []

    # Step 1: Create character
    print("▸ Creating character: Zephmir (Female Tiefling Rogue)")
    print_separator()
    t0 = time.time()
    data = post("create_character", {"character": CHARACTER})
    elapsed = time.time() - t0

    if not data.get("success"):
        print(f"  ✗ Character creation failed: {data.get('error')}")
        sys.exit(1)

    game_state = data.get("gameState", {})
    print(f"  ✓ Character created ({elapsed:.1f}s)")
    print_state(game_state)
    results.append({"step": "create_character", "success": True, "time": elapsed})
    print()

    # Step 2: Start game
    print("▸ Starting game")
    print_separator()
    t0 = time.time()
    data = post("start_game", {"gameState": game_state})
    elapsed = time.time() - t0

    if not data.get("success"):
        print(f"  ✗ Game start failed: {data.get('error')}")
        sys.exit(1)

    game_state = data.get("gameState", game_state)
    print(f"  ✓ Game started ({elapsed:.1f}s)")
    print_dm_response(data)
    print_state(game_state)
    results.append({"step": "start_game", "success": True, "time": elapsed})
    print()

    # Steps 3–7: Play 5 turns
    for i, action_text in enumerate(TURNS, start=1):
        print(f"▸ Turn {i}: {action_text}")
        print_separator()
        t0 = time.time()
        data = post("player_action", {
            "gameState": game_state,
            "message": action_text,
        })
        elapsed = time.time() - t0

        success = data.get("success", False)
        if not success:
            print(f"  ✗ Turn failed: {data.get('error')}")
        else:
            game_state = data.get("gameState", game_state)
            print(f"  ✓ Turn completed ({elapsed:.1f}s)")
            print_dm_response(data)
            print_state(game_state)

        results.append({
            "step": f"turn_{i}",
            "action": action_text,
            "success": success,
            "time": elapsed,
            "had_check": data.get("checkRoll") is not None,
            "had_image": data.get("imagePrompt") is not None,
        })
        print()

    # ── Feedback report ───────────────────────────────────────────────
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║                      Playtest Report                               ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    print()

    total_time = sum(r["time"] for r in results)
    successes = sum(1 for r in results if r["success"])
    total = len(results)
    checks = sum(1 for r in results if r.get("had_check"))
    images = sum(1 for r in results if r.get("had_image"))

    print(f"  Steps passed:    {successes}/{total}")
    print(f"  Total time:      {total_time:.1f}s")
    print(f"  Avg per step:    {total_time / total:.1f}s")
    print(f"  Skill checks:    {checks}")
    print(f"  Images generated: {images}")
    print()

    for r in results:
        status = "✓" if r["success"] else "✗"
        line = f"  {status} {r['step']:20s} {r['time']:5.1f}s"
        if r.get("action"):
            line += f"  — {r['action'][:50]}"
        print(line)

    print()
    if successes == total:
        print("  Result: ALL STEPS PASSED ✓")
    else:
        print(f"  Result: {total - successes} STEP(S) FAILED ✗")

    print()

    # Final state dump
    print("▸ Final game state (JSON):")
    print_separator()
    final = post("get_state", {"gameState": game_state})
    print(json.dumps(final, indent=2)[:2000])


if __name__ == "__main__":
    main()
