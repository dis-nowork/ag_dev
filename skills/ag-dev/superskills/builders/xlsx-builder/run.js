#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(inputData);
    const result = await buildXlsx(input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
});

async function buildXlsx(input) {
  const { sheets, title = 'AG Dev Workbook' } = input;
  
  if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
    throw new Error('sheets array is required');
  }

  const outputDir = '/tmp/superskill-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
  const filePath = path.join(outputDir, fileName);
  
  // Create temporary directory for XML files
  const tempDir = `/tmp/xlsx-temp-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Generate XML content
    await createXlsxXML(tempDir, sheets, title);
    
    // Create ZIP archive
    await createZipArchive(tempDir, filePath);
    
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true });
    
    return { filePath };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    throw error;
  }
}

async function createXlsxXML(tempDir, sheets, title) {
  // Create directory structure
  const dirs = [
    '_rels',
    'docProps',
    'xl',
    'xl/_rels',
    'xl/worksheets'
  ];
  
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
  });

  // [Content_Types].xml
  let contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`;

  for (let i = 1; i <= sheets.length; i++) {
    contentTypes += `\n  <Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }

  contentTypes += `\n</Types>`;

  // _rels/.rels
  const mainRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  // xl/_rels/workbook.xml.rels
  let workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

  for (let i = 1; i <= sheets.length; i++) {
    workbookRels += `\n  <Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`;
  }

  workbookRels += `\n</Relationships>`;

  // docProps/app.xml
  const appProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>AG Dev SuperSkill</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
</Properties>`;

  // docProps/core.xml
  const coreProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXML(title)}</dc:title>
  <dc:creator>AG Dev SuperSkill</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

  // xl/styles.xml
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <b/>
    </font>
  </fonts>
  <fills count="2">
    <fill>
      <patternFill patternType="none"/>
    </fill>
    <fill>
      <patternFill patternType="gray125"/>
    </fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

  // Collect all strings for shared strings
  const stringMap = new Map();
  let stringIndex = 0;
  
  sheets.forEach(sheet => {
    sheet.headers.forEach(header => {
      if (!stringMap.has(header)) {
        stringMap.set(header, stringIndex++);
      }
    });
    
    sheet.rows.forEach(row => {
      row.forEach(cell => {
        if (typeof cell === 'string' && !stringMap.has(cell)) {
          stringMap.set(cell, stringIndex++);
        }
      });
    });
  });

  // xl/sharedStrings.xml
  let sharedStrings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${stringIndex}" uniqueCount="${stringIndex}">`;

  for (const [str] of stringMap) {
    sharedStrings += `\n  <si><t>${escapeXML(str)}</t></si>`;
  }

  sharedStrings += `\n</sst>`;

  // xl/workbook.xml
  let workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>`;

  sheets.forEach((sheet, index) => {
    workbook += `\n    <sheet name="${escapeXML(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 3}"/>`;
  });

  workbook += `\n  </sheets>
</workbook>`;

  // Create worksheet files
  sheets.forEach((sheet, index) => {
    const sheetXML = createWorksheetXML(sheet, stringMap);
    fs.writeFileSync(path.join(tempDir, 'xl', 'worksheets', `sheet${index + 1}.xml`), sheetXML);
  });

  // Write all files
  fs.writeFileSync(path.join(tempDir, '[Content_Types].xml'), contentTypes);
  fs.writeFileSync(path.join(tempDir, '_rels', '.rels'), mainRels);
  fs.writeFileSync(path.join(tempDir, 'xl', '_rels', 'workbook.xml.rels'), workbookRels);
  fs.writeFileSync(path.join(tempDir, 'docProps', 'app.xml'), appProps);
  fs.writeFileSync(path.join(tempDir, 'docProps', 'core.xml'), coreProps);
  fs.writeFileSync(path.join(tempDir, 'xl', 'styles.xml'), styles);
  fs.writeFileSync(path.join(tempDir, 'xl', 'sharedStrings.xml'), sharedStrings);
  fs.writeFileSync(path.join(tempDir, 'xl', 'workbook.xml'), workbook);
}

function createWorksheetXML(sheet, stringMap) {
  const { headers, rows } = sheet;
  
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>`;
  
  // Header row (row 1)
  xml += '\n    <row r="1">';
  headers.forEach((header, colIndex) => {
    const cellRef = columnIndexToLetter(colIndex) + '1';
    xml += `\n      <c r="${cellRef}" s="1" t="inlineStr">`;
    xml += `\n        <is><t>${escapeXML(header)}</t></is>`;
    xml += '\n      </c>';
  });
  xml += '\n    </row>';
  
  // Data rows
  rows.forEach((row, rowIndex) => {
    const rowNum = rowIndex + 2; // Start from row 2
    xml += `\n    <row r="${rowNum}">`;
    
    row.forEach((cell, colIndex) => {
      const cellRef = columnIndexToLetter(colIndex) + rowNum;
      
      if (cell === null || cell === undefined) {
        xml += `\n      <c r="${cellRef}"/>`;
      } else if (typeof cell === 'string') {
        xml += `\n      <c r="${cellRef}" t="s">`;
        xml += `\n        <v>${stringMap.get(cell)}</v>`;
        xml += '\n      </c>';
      } else if (typeof cell === 'number') {
        xml += `\n      <c r="${cellRef}">`;
        xml += `\n        <v>${cell}</v>`;
        xml += '\n      </c>';
      } else if (typeof cell === 'boolean') {
        xml += `\n      <c r="${cellRef}" t="b">`;
        xml += `\n        <v>${cell ? '1' : '0'}</v>`;
        xml += '\n      </c>';
      }
    });
    
    xml += '\n    </row>';
  });
  
  xml += '\n  </sheetData>';
  xml += '\n</worksheet>';
  
  return xml;
}

function columnIndexToLetter(index) {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

function escapeXML(text) {
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    // Try to use system zip command
    const { spawn } = require('child_process');
    
    const zip = spawn('zip', ['-r', outputPath, '.'], {
      cwd: sourceDir,
      stdio: 'pipe'
    });
    
    zip.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Zip process exited with code ${code}`));
      }
    });
    
    zip.on('error', (err) => {
      reject(err);
    });
  });
}