# Features Research

**Domain:** Group Scheduling
**Researched:** 2026-04-01

## Feature Categories

### Table Stakes (Must Have)

| Feature | Importance | Complexity | Rationale |
|---------|------------|------------|-----------|
| **Multi-option Voting** | HIGH | LOW | Foundation of scheduling polls. |
| **Local Time Display** | HIGH | MEDIUM | Critical for remote teams. |
| **Real-time Results** | HIGH | LOW | Users need to see current consensus. |
| **Mobile Responsiveness** | HIGH | LOW | Often used on the go. |
| **Edit/Update Vote** | MEDIUM | MEDIUM | Users change their minds. |

### Differentiators (Competitive Advantage)

| Feature | Importance | Complexity | Rationale |
|---------|------------|------------|-----------|
| **Stateless Privacy** | HIGH | LOW | No accounts = extreme privacy. Huge for FOSS fans. |
| **Edge-Speed UI** | MEDIUM | LOW | Using Hono + Workers makes it feel native. |
| **Optimal Slot Highlight** | HIGH | LOW | Saves user cognitive load. Instant decision. |
| **Keyboard Navigation** | LOW | LOW | Power user feature for quick voting. |

### Anti-features (Deliberately NOT Building)

| Feature | Why Avoid |
|---------|-----------|
| **User Profiles** | Defeats the "Stateless/No Auth" mission. |
| **Email Reminders** | PII storage and SMTP management overhead. |
| **Real-time Websockets** | Overkill for asynchronous polls. |
| **Complex Permissions** | Violates "The URL is the only identity" constraint. |

## Feature Interaction Analysis

- **Vote Stability:** When a user updates their vote, the grid must re-calculate the "Optimal Slot" immediately.
- **Timezone Conflicts:** The grid MUST show the participant's timezone to ensure everyone knows "9 AM" means different things.

---
*Features research for: timeslot.ink*
