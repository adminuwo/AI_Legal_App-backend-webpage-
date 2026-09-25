import fs from 'fs';

// 1. Update models/User.js
let userContent = fs.readFileSync('models/User.js', 'utf8').replace(/\r\n/g, '\n');
const userTarget = '        consultationFee: { type: Number, default: 1500 },';
const userReplacement = `        consultationFee: { type: Number, default: 1500 },
        consultationDuration: { type: Number, default: 15 },
        perMinuteExtensionFee: { type: Number, default: 100 },
        platformCommissionPercentage: { type: Number, default: 30 },
        advocatePayoutPer15Min: { type: Number, default: 1050 },
        advocatePayoutPerMinute: { type: Number, default: 70 },`;

if (userContent.includes(userTarget) && !userContent.includes('consultationDuration')) {
  userContent = userContent.replace(userTarget, userReplacement);
  fs.writeFileSync('models/User.js', userContent, 'utf8');
  console.log('✓ models/User.js updated');
} else {
  console.log('- models/User.js already up to date');
}

// 2. Update routes/consultationRoutes.js
let routeContent = fs.readFileSync('routes/consultationRoutes.js', 'utf8').replace(/\r\n/g, '\n');

// In prefill:
const prefillTarget = `                consultationFee: verification.consultationFee || 1500,
                consultationTypes: verification.consultationTypes || ['chat', 'audio', 'video'],`;

const prefillReplacement = `                consultationFee: verification.consultationFee || 1500,
                consultationDuration: verification.consultationDuration || 15,
                perMinuteExtensionFee: verification.perMinuteExtensionFee || Math.max(1, Math.round((verification.consultationFee || 1500) / 15)),
                platformCommissionPercentage: 30,
                advocatePayoutPer15Min: Math.round((verification.consultationFee || 1500) * 0.70),
                advocatePayoutPerMinute: Math.round(((verification.consultationFee || 1500) / 15) * 0.70),
                consultationTypes: verification.consultationTypes || ['chat', 'audio', 'video'],`;

if (routeContent.includes(prefillTarget)) {
  routeContent = routeContent.replace(prefillTarget, prefillReplacement);
}

// In register POST save:
const saveTarget = `        user.advocateVerification.consultationFee = Number(consultationFee) || 1500;
        user.advocateVerification.consultationTypes = Array.isArray(consultationTypes) && consultationTypes.length ? consultationTypes : ['chat', 'audio', 'video'];`;

const saveReplacement = `        const baseFee = Number(consultationFee) || 1500;
        user.advocateVerification.consultationFee = baseFee;
        user.advocateVerification.consultationDuration = 15; // 15 mins base session
        user.advocateVerification.perMinuteExtensionFee = Math.max(1, Math.round(baseFee / 15));
        user.advocateVerification.platformCommissionPercentage = 30; // 30% platform fee
        user.advocateVerification.advocatePayoutPer15Min = Math.round(baseFee * 0.70);
        user.advocateVerification.advocatePayoutPerMinute = Math.round((baseFee / 15) * 0.70);
        user.advocateVerification.consultationTypes = Array.isArray(consultationTypes) && consultationTypes.length ? consultationTypes : ['chat', 'audio', 'video'];`;

if (routeContent.includes(saveTarget)) {
  routeContent = routeContent.replace(saveTarget, saveReplacement);
}

fs.writeFileSync('routes/consultationRoutes.js', routeContent, 'utf8');
console.log('✓ routes/consultationRoutes.js updated');
