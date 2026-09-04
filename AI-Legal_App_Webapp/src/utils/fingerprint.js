export const getDeviceFingerprint = () => {
    const navigator_info = window.navigator;
    const screen_info = window.screen;

    let fingerprint = navigator_info.userAgent;
    fingerprint += navigator_info.language;
    fingerprint += screen_info.colorDepth;
    fingerprint += screen_info.width + "x" + screen_info.height;
    fingerprint += new Date().getTimezoneOffset();
    fingerprint += navigator_info.hardwareConcurrency;

    // Use a simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};
