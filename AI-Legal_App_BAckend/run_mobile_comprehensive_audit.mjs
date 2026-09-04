import fs from 'fs';
import path from 'path';

const mobileRoot = 'c:\\Users\\WELCOME\\Desktop\\project\\AI Legal App\\AI-Legal_App_frontend-mobile';
const auditDir = 'c:\\Users\\WELCOME\\Desktop\\project\\AI Legal App\\audit_reports';

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.expo', '.vscode', '.git', 'archive'].includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(path.extname(file))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allMobileFiles = getAllFiles(mobileRoot);
console.log(`Found ${allMobileFiles.length} mobile source files to audit.`);

// 1. Large & Monolithic Files Analysis
const fileSizes = allMobileFiles.map(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  const sizeBytes = fs.statSync(filePath).size;
  return {
    filePath: filePath.replace(mobileRoot, 'AI-Legal_App_frontend-mobile'),
    lines,
    sizeBytes,
    sizeKB: Math.round(sizeBytes / 1024)
  };
}).sort((a, b) => b.lines - a.lines);

const largeFiles = fileSizes.filter(f => f.lines > 300);

// 2. Hardcoded Data, URLs & Credentials in Mobile
const hardcodedFindings = [];
const localIpRegex = /https?:\/\/(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|localhost|127\.0\.0\.1)(?::\d+)?/gi;
const hardcodedAdminEmailRegex = /admin@uwo24\.com|aditilakhera0@gmail\.com|test@test\.com|example\.com/gi;
const hardcodedKeyRegex = /rzp_(?:live|test)_[A-Za-z0-9]+|sk-[A-Za-z0-9]{20,}|AIzaSy[A-Za-z0-9_-]{33}/gi;

allMobileFiles.forEach(filePath => {
  const relPath = filePath.replace(mobileRoot, 'AI-Legal_App_frontend-mobile');
  if (relPath.includes('package-lock.json')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check IP
    const ipMatch = line.match(localIpRegex);
    if (ipMatch) {
      hardcodedFindings.push({
        type: 'HARDCODED_LOCAL_IP_OR_LOCALHOST',
        file: relPath,
        line: idx + 1,
        snippet: line.trim().slice(0, 100),
        value: ipMatch[0],
        severity: 'P1 - High (Breaks in production builds)'
      });
    }

    // Check Hardcoded Email
    const emailMatch = line.match(hardcodedAdminEmailRegex);
    if (emailMatch) {
      hardcodedFindings.push({
        type: 'HARDCODED_EMAIL_OR_BYPASS',
        file: relPath,
        line: idx + 1,
        snippet: line.trim().slice(0, 100),
        value: emailMatch[0],
        severity: 'P1 - High (Hardcoded Admin/Test Identity)'
      });
    }

    // Check Hardcoded API Keys
    const keyMatch = line.match(hardcodedKeyRegex);
    if (keyMatch) {
      hardcodedFindings.push({
        type: 'HARDCODED_API_KEY',
        file: relPath,
        line: idx + 1,
        snippet: line.trim().slice(0, 100),
        value: keyMatch[0].slice(0, 10) + '...',
        severity: 'P0 - Critical (Secret Exposure in Client Bundle)'
      });
    }
  });
});

// 3. UI Responsiveness & Device Hazards in Mobile
const uiHazards = [];
allMobileFiles.forEach(filePath => {
  const relPath = filePath.replace(mobileRoot, 'AI-Legal_App_frontend-mobile');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Rigid fixed dimensions > 300px
    if (/(?:width|height|minWidth|minHeight)\s*:\s*(?:[4-9]\d\d|\d{4,})/i.test(line) && !line.includes('Dimensions') && !line.includes('useWindowDimensions')) {
      uiHazards.push({
        type: 'FIXED_OVERSIZED_DIMENSION',
        file: relPath,
        line: idx + 1,
        snippet: line.trim().slice(0, 100),
        hazard: 'Fixed pixel sizing > 400px clips on compact screens (< 375px)',
        severity: 'P2 - Medium'
      });
    }

    // Missing SafeArea context / Hardcoded top margins
    if (/marginTop\s*:\s*(?:4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9])/i.test(line) && !content.includes('useSafeAreaInsets') && !content.includes('SafeAreaView')) {
      uiHazards.push({
        type: 'HARDCODED_TOP_MARGIN_NOTCH_HAZARD',
        file: relPath,
        line: idx + 1,
        snippet: line.trim().slice(0, 100),
        hazard: 'Hardcoded top margin without SafeAreaInsets may collide with Dynamic Island / status bar',
        severity: 'P2 - Medium'
      });
    }

    // Unvirtualized scrollview mapping large arrays
    if (/<ScrollView[\s\S]*?>[\s\S]*?\.map\(/i.test(line) || (line.includes('.map(') && content.includes('<ScrollView') && !content.includes('<FlatList') && !content.includes('<FlashList'))) {
      if (line.includes('.map(')) {
        uiHazards.push({
          type: 'UNVIRTUALIZED_SCROLLVIEW_LIST',
          file: relPath,
          line: idx + 1,
          snippet: line.trim().slice(0, 100),
          hazard: 'Array mapping inside ScrollView instantiates all elements at once, degrading FPS and causing memory spikes on long lists',
          severity: 'P1 - High'
        });
      }
    }
  });
});

// 4. API Endpoints and Services in Mobile
const apiEndpointCalls = [];
const endpointRegex = /['"`](\/(?:api|v1|auth|chat|cases|tools|subscription|admin|projects|payments)[^'"`\s]*)['"`]/gi;

allMobileFiles.forEach(filePath => {
  const relPath = filePath.replace(mobileRoot, 'AI-Legal_App_frontend-mobile');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    let match;
    while ((match = endpointRegex.exec(line)) !== null) {
      apiEndpointCalls.push({
        file: relPath,
        line: idx + 1,
        endpoint: match[1],
        snippet: line.trim().slice(0, 100)
      });
    }
  });
});

const mobileAuditData = {
  totalFilesAudited: allMobileFiles.length,
  largeFilesCount: largeFiles.length,
  topLargeFiles: largeFiles.slice(0, 20),
  hardcodedFindingsCount: hardcodedFindings.length,
  hardcodedFindingsSample: hardcodedFindings,
  uiHazardsCount: uiHazards.length,
  uiHazardsSample: uiHazards.slice(0, 30),
  apiEndpointCallsCount: apiEndpointCalls.length,
  apiEndpointCallsSample: apiEndpointCalls.slice(0, 40)
};

fs.writeFileSync(
  path.join(auditDir, 'raw_mobile_app_audit.json'),
  JSON.stringify(mobileAuditData, null, 2)
);

console.log(`=== MOBILE AUDIT SCAN FINISHED ===`);
console.log(`- Large Files (>300 lines): ${largeFiles.length}`);
console.log(`- Hardcoded Data / IPs / Emails: ${hardcodedFindings.length}`);
console.log(`- UI Responsive & Notch Hazards: ${uiHazards.length}`);
console.log(`- API Endpoints Mapped: ${apiEndpointCalls.length}`);
