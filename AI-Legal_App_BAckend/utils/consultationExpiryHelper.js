/**
 * Consultation Time Slot Lifecycle & Expiry Helper
 * Accurately determines if a consultation's scheduled slot is Upcoming, Live, or Expired in Indian Standard Time (IST).
 */

export function parseSlotTimeRange(scheduledDate, scheduledTimeSlot, defaultDurationMinutes = 45) {
    if (!scheduledDate) return null;
    const baseDate = new Date(scheduledDate);
    if (isNaN(baseDate.getTime())) return null;

    // Format date in IST (Asia/Kolkata) as YYYY-MM-DD
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const dateStr = istFormatter.format(baseDate);
    const [year, month, day] = dateStr.split('-').map(Number);

    let startHour = 0;
    let startMinute = 0;
    let endHour = 23;
    let endMinute = 59;
    let hasSpecificTime = false;

    const parseTimeStr = (str) => {
        if (!str || typeof str !== 'string') return null;
        const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return null;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridiem = match[3].toUpperCase();
        if (meridiem === 'PM' && h < 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        return { h, m };
    };

    if (scheduledTimeSlot && typeof scheduledTimeSlot === 'string') {
        const parts = scheduledTimeSlot.split('-').map(s => s.trim());
        const startParsed = parseTimeStr(parts[0]);
        if (startParsed) {
            hasSpecificTime = true;
            startHour = startParsed.h;
            startMinute = startParsed.m;

            if (parts.length > 1) {
                const endParsed = parseTimeStr(parts[1]);
                if (endParsed) {
                    endHour = endParsed.h;
                    endMinute = endParsed.m;
                } else {
                    const totalM = startHour * 60 + startMinute + defaultDurationMinutes;
                    endHour = Math.floor(totalM / 60) % 24;
                    endMinute = totalM % 60;
                }
            } else {
                const totalM = startHour * 60 + startMinute + defaultDurationMinutes;
                endHour = Math.floor(totalM / 60) % 24;
                endMinute = totalM % 60;
            }
        }
    }

    // IST offset: UTC+5:30 (19800000 ms)
    const IST_OFFSET_MS = 19800000;
    const startUtcMs = Date.UTC(year, month - 1, day, startHour, startMinute, 0) - IST_OFFSET_MS;
    const endUtcMs = Date.UTC(year, month - 1, day, endHour, endMinute, 0) - IST_OFFSET_MS;

    const formattedDate = baseDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
    });

    return {
        year,
        month,
        day,
        startHour,
        startMinute,
        endHour,
        endMinute,
        startUtcMs,
        endUtcMs,
        hasSpecificTime,
        formattedDate
    };
}

/**
 * Returns detailed status of a consultation's scheduled slot.
 * - 'upcoming': Slot has not started yet (more than earlyJoinBufferMinutes before start)
 * - 'live': Slot is active right now (between start-buffer and end+grace)
 * - 'expired': Slot has passed (after end+grace)
 * - 'pending_schedule': Date/time slot not set
 */
export function getConsultationSlotStatus(
    scheduledDate,
    scheduledTimeSlot,
    earlyJoinBufferMinutes = 10,
    graceEndMinutes = 15
) {
    if (!scheduledDate) {
        return {
            state: 'pending_schedule',
            isLive: false,
            isUpcoming: false,
            isExpired: false,
            canJoinCall: false,
            canChat: false,
            message: 'Consultation date and time slot have not been finalized yet.'
        };
    }

    const range = parseSlotTimeRange(scheduledDate, scheduledTimeSlot);
    if (!range) {
        return {
            state: 'pending_schedule',
            isLive: false,
            isUpcoming: false,
            isExpired: false,
            canJoinCall: false,
            canChat: false,
            message: 'Invalid consultation schedule date.'
        };
    }

    const now = Date.now();
    const earliestAllowedJoinMs = range.startUtcMs - (earlyJoinBufferMinutes * 60 * 1000);
    const latestAllowedEndMs = range.endUtcMs + (graceEndMinutes * 60 * 1000);
    const formattedDate = range.formattedDate;
    const slotLabel = scheduledTimeSlot || 'scheduled slot';

    if (now < earliestAllowedJoinMs) {
        return {
            state: 'upcoming',
            isLive: false,
            isUpcoming: true,
            isExpired: false,
            canJoinCall: false,
            canChat: false,
            startTimeMs: range.startUtcMs,
            endTimeMs: range.endUtcMs,
            formattedDate,
            message: `Consultation is scheduled for ${formattedDate} at ${slotLabel}. You can join 10 minutes before the scheduled time.`
        };
    }

    if (now > latestAllowedEndMs) {
        return {
            state: 'expired',
            isLive: false,
            isUpcoming: false,
            isExpired: true,
            canJoinCall: false,
            canChat: false,
            startTimeMs: range.startUtcMs,
            endTimeMs: range.endUtcMs,
            formattedDate,
            message: `This consultation slot (${slotLabel}) has ended. Calls and messaging are closed.`
        };
    }

    // Inside active window
    return {
        state: 'live',
        isLive: true,
        isUpcoming: false,
        isExpired: false,
        canJoinCall: true,
        canChat: true,
        startTimeMs: range.startUtcMs,
        endTimeMs: range.endUtcMs,
        formattedDate,
        message: `Consultation is currently live (${slotLabel}).`
    };
}

export function isConsultationSlotExpired(scheduledDate, scheduledTimeSlot, graceMinutes = 15) {
    const status = getConsultationSlotStatus(scheduledDate, scheduledTimeSlot, 10, graceMinutes);
    return status.isExpired;
}

export function isConsultationSlotActive(scheduledDate, scheduledTimeSlot, earlyJoinBufferMinutes = 10, graceMinutes = 15) {
    const status = getConsultationSlotStatus(scheduledDate, scheduledTimeSlot, earlyJoinBufferMinutes, graceMinutes);
    return status.isLive;
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
