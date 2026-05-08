# RemiNote: Neural Ranking Score (NRS) Mechanism

RemiNote has transitioned from a rigid Spaced Repetition System (SRS) to a dynamic, priority-driven **Neural Ranking Score (NRS)** model. This system treats your knowledge base as a fluid stream, where priority is determined by memory performance, time decay, and manual significance.

## 🧠 Core Philosophy: The Knowledge Stream
Unlike traditional systems that hide cards until a specific "due date," NRS keeps all knowledge in a ranked queue. The goal is to always present the most **"Urgent"** and **"Significant"** fragments first, ensuring 100% coverage while prioritizing high-impact nodes.

## 🔢 The Scoring Formula
The priority of a fragment is calculated dynamically every time you view the dashboard or review queue:

$$Score = (BasePriority + AgeingFactor) \times ManualMultiplier$$

### 1. Base Priority (`priority_score`)
*   **Starting Point**: New fragments start at **500.0** points.
*   **Interaction Shifts**:
    *   **Mastered**: Subtracts **400.0** points. (Moves the card deep into the background).
    *   **Understood**: Subtracts **200.0** points. (Moves the card back).
    *   **Forgotten (Wrong)**: Adds **150.0** points. (Immediately boosts the card to the top).

### 2. Ageing Factor (Temporal Decay)
To prevent "Knowledge Starvation" (where old cards are never seen), cards gain priority over time:
*   **Rate**: **+10.0 points per day** since the last interaction.
*   This ensures that even if you've mastered a card, it will eventually float back to the top of your stream as it "ages" and needs a refresh.

### 3. Manual Multiplier (`manual_weight`)
Users can manually influence the "Gravity" of a node:
*   **High**: **1.5x** multiplier (Stays at the top longer).
*   **Medium**: **1.0x** multiplier (Standard behavior).
*   **Low**: **0.5x** multiplier (Sinks faster, seen less often).

---

## 🚦 Ranking Indicators
In the UI, fragments are displayed with visual cues to help you understand their current state:
*   **#Rank**: The numerical position (#1, #2...) in your total knowledge pool.
*   **NRS Badge**: Displays the raw calculated score. High scores (e.g., > 800) indicate "Hot" knowledge requiring urgent attention.
*   **Priority Icons**: Glow effects or specific colors (Emerald for High Priority) based on your manual weight settings.

## 🔄 Interaction Logic Flow
When you interact with a card via the **Review Mode** or **Dashboard Actions**:

1.  **Interaction Event**: You click "Mastered" or "Understand".
2.  **Point Delta**: The system applies the negative points to `priority_score`.
3.  **Timestamp Update**: `last_reviewed_at` is set to NOW.
4.  **Re-Ranking**: The dashboard instantly refreshes. Because `last_reviewed_at` is now zero days ago, the **Ageing Factor** resets to 0, and the card's position drops based on the interaction tier.

## 📡 API Implementation
*   **`GET /api/reminders/review-queue`**: Returns the Top 30 ranked fragments.
*   **`POST /api/reminders/{id}/interact`**: Directions for the point shifts (+/-).
*   **Sorting**: All lists are sorted by `desc(dynamic_score)`.

---

> [!TIP]
> **Pro Tip**: Use "High Priority" for critical exam material or current work projects. Even if you "Master" them, the 1.5x multiplier will keep them resurfacing faster than standard "Low" priority notes.
