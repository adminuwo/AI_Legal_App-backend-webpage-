/**
 * Consultation Time Slot Expiry Helper
 * Accurately determines if a consultation's scheduled slot has ended in Indian Standard Time (IST).
 */

export function isConsultationSlotExpired(scheduledDate, scheduledTimeSlot, graceMinutes = 15) {
    if (!scheduledDate) return false;
    const baseDate = new Date(scheduledDate);
    if (isNaN(baseDate.getTime())) return false;

    // Format date in IST (Asia/Kolkata) as YYYY-MM-DD
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const dateStr = istFormatter.format(baseDate);
    const [year, month, day] = dateStr.split('-').map(Number);

    let endHour = 23;
    let endMinute = 59;

    if (scheduledTimeSlot && typeof scheduledTimeSlot === 'string') {
        const parts = scheduledTimeSlot.split('-').map(s => s.trim());
        const timePart = parts.length > 1 ? parts[1] : parts[0];
        const match = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const meridiem = match[3].toUpperCase();

            if (meridiem === 'PM' && h < 12) h += 12;
            if (meridiem === 'AM' && h === 12) h = 0;

            if (parts.length === 1) {
                // Single time format (e.g. "5:30 PM") -> allocate default 45 mins slot
                const totalM = h * 60 + m + 45;
                endHour = Math.floor(totalM / 60) % 24;
                endMinute = totalM % 60;
            } else {
                endHour = h;
                endMinute = m;
            }
        }
    }

    // IST offset: UTC+5:30 (19800000 ms)
    const IST_OFFSET_MS = 19800000;
    const slotEndTimeUtcMs = Date.UTC(year, month - 1, day, endHour, endMinute, 0) - IST_OFFSET_MS;
    const effectiveExpiryMs = slotEndTimeUtcMs + (graceMinutes * 60 * 1000);

    return Date.now() > effectiveExpiryMs;
}

/**
 * Checks a ConsultationRequest document or plain object and transitions it to 'expired'
 * if its time slot has ended.
 */
export async function autoExpireConsultation(request, saveToDb = true) {
    if (!request) return request;

    const activeStatuses = ['pending', 'accepted', 'scheduled'];
    if (!activeStatuses.includes((request.status || '').toLowerCase())) {
        return request;
    }

    if (isConsultationSlotExpired(request.scheduledDate, request.scheduledTimeSlot)) {
        request.status = 'expired';

        if (saveToDb && typeof request.save === 'function') {
            request.timeline = request.timeline || [];
            request.timeline.push({
                status: 'expired',
                title: 'Consultation Expired',
                description: `Consultation time slot (${request.scheduledTimeSlot || 'scheduled slot'}) has ended.`,
                timestamp: new Date()
            });
            await request.save();
        }
    }

    return request;
}
