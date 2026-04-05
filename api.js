/**
 * api.js: The technical contract for local <-> UTC conversion and D1 API interactions.
 */

const BASE_URL = '/api';

/**
 * Normalizes a datetime-local value (formatted as YYYY-MM-DDTHH:mm) to a UTC ISO string.
 * This handles the "wall time" problem by converting the input to a local Date object,
 * then serializing to ISO 8601 (which is always UTC).
 */
export const toUTC = (localISO) => {
    if (!localISO) return null;
    const date = new Date(localISO);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
};

/**
 * Converts a UTC ISO string back to a format suitable for <input type="datetime-local">.
 * Format: YYYY-MM-DDTHH:mm
 */
export const toLocal = (utcISO) => {
    if (!utcISO) return '';
    const date = new Date(utcISO);
    
    // Adjusted ISO string to local datetime format (manual formatting for precision)
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
};

/**
 * Formats a UTC ISO string to structured local date components for stacked rendering.
 * Returns: { weekday: "Tue", date: "Apr 4", time: "1:30 PM" }
 */
export const formatDate = (utcISO) => {
    if (!utcISO) return { weekday: '', date: '', time: '' };
    const date = new Date(utcISO);
    
    return {
        weekday: date.toLocaleString('en-US', { weekday: 'short' }),
        date: date.toLocaleString('en-US', { month: 'short', day: '2-digit' }),
        time: date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
};

/**
 * Formats a start and optional end time into a human-readable range.
 * Example: "Jun 01, 14:00 – 15:30"
 */
export const formatRange = (startUTC, endUTC) => {
    if (!startUTC) return '';
    const start = new Date(startUTC);
    const startStr = start.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    
    if (!endUTC) return startStr;
    
    const end = new Date(endUTC);
    const timeStr = end.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    
    return `${startStr} – ${timeStr}`;
};

/**
 * Validates that a date is not in the past relative to the current local time.
 */
export const isPastDate = (isoString) => {
    if (!isoString) return false;
    const date = new Date(isoString);
    return date.getTime() < Date.now();
};

/**
 * D1 API Wrappers
 */
export const API = {
    async createPoll(payload) {
        const res = await fetch(`${BASE_URL}/polls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create poll');
        return res.json();
    },

    async getPoll(id) {
        const res = await fetch(`${BASE_URL}/polls/${id}`);
        if (!res.ok) throw new Error('Poll not found');
        return res.json();
    },

    async submitVote(pollId, payload) {
        const res = await fetch(`${BASE_URL}/polls/${pollId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to submit vote');
        return res.json();
    },

    async getResponse(pollId, editToken) {
        const res = await fetch(`${BASE_URL}/polls/${pollId}/response/${editToken}`);
        if (!res.ok) throw new Error('Response not found');
        return res.json();
    },

    async updateResponse(pollId, editToken, payload) {
        const res = await fetch(`${BASE_URL}/polls/${pollId}/response/${editToken}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update response');
        return res.json();
    }
};
