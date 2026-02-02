#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createWriteStream, createReadStream } = require('fs');
const { pipeline } = require('stream');
const archiver = require('archiver');

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(inputData);
    const result = await buildDocx(input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
});

async function buildDocx(input) {
  const { title, content, author = 'AG Dev', template = 'report' } = input;
  
  if (!title || !content) {
    throw new Error('title and content are required');
  }

  const outputDir = '/tmp/superskill-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
  const filePath = path.join(outputDir, fileName);
  
  // Create temporary directory for XML files
  const tempDir = `/tmp/docx-temp-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Generate XML content
    await createDocxXML(tempDir, title, content, author, template);
    
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

async function createDocxXML(tempDir, title, content, author, template) {
  // Create directory structure
  const dirs = [
    '_rels',
    'docProps',
    'word',
    'word/_rels',
    'word/theme'
  ];
  
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
  });

  // [Content_Types].xml
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

  // _rels/.rels
  const mainRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  // word/_rels/document.xml.rels
  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

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
  <dc:creator>${escapeXML(author)}</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

  // word/styles.xml
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr>
      <w:spacing w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:pPr>
      <w:spacing w:before="200" w:after="100"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>`;

  // Convert markdown content to Word XML
  const documentBody = convertMarkdownToWordXML(content);
  
  // word/document.xml
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Title"/>
      </w:pPr>
      <w:r>
        <w:t>${escapeXML(title)}</w:t>
      </w:r>
    </w:p>
    ${documentBody}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  // Write all files
  fs.writeFileSync(path.join(tempDir, '[Content_Types].xml'), contentTypes);
  fs.writeFileSync(path.join(tempDir, '_rels', '.rels'), mainRels);
  fs.writeFileSync(path.join(tempDir, 'word', '_rels', 'document.xml.rels'), documentRels);
  fs.writeFileSync(path.join(tempDir, 'docProps', 'app.xml'), appProps);
  fs.writeFileSync(path.join(tempDir, 'docProps', 'core.xml'), coreProps);
  fs.writeFileSync(path.join(tempDir, 'word', 'styles.xml'), styles);
  fs.writeFileSync(path.join(tempDir, 'word', 'document.xml'), document);
}

function convertMarkdownToWordXML(markdown) {
  const lines = markdown.split('\n');
  let xml = '';
  let inList = false;
  
  for (const line of lines) {
    if (line.trim() === '') {
      if (inList) {
        inList = false;
      }
      continue;
    }
    
    // Headers
    if (line.startsWith('# ')) {
      xml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXML(line.substring(2))}</w:t></w:r></w:p>`;
    } else if (line.startsWith('## ')) {
      xml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${escapeXML(line.substring(3))}</w:t></w:r></w:p>`;
    }
    // List items
    else if (line.startsWith('- ')) {
      if (!inList) {
        inList = true;
      }
      const text = formatInlineMarkdown(line.substring(2));
      xml += `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${text}</w:p>`;
    }
    // Regular paragraphs
    else {
      if (inList) {
        inList = false;
      }
      const text = formatInlineMarkdown(line);
      xml += `<w:p>${text}</w:p>`;
    }
  }
  
  return xml;
}

function formatInlineMarkdown(text) {
  let xml = '';
  let current = '';
  let i = 0;
  
  while (i < text.length) {
    // Bold text **text**
    if (text.substring(i, i + 2) === '**') {
      if (current) {
        xml += `<w:r><w:t>${escapeXML(current)}</w:t></w:r>`;
        current = '';
      }
      i += 2;
      let boldText = '';
      while (i < text.length - 1 && text.substring(i, i + 2) !== '**') {
        boldText += text[i];
        i++;
      }
      if (text.substring(i, i + 2) === '**') {
        xml += `<w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXML(boldText)}</w:t></w:r>`;
        i += 2;
      } else {
        current += '**' + boldText;
      }
    }
    // Italic text *text*
    else if (text[i] === '*' && text[i + 1] !== '*') {
      if (current) {
        xml += `<w:r><w:t>${escapeXML(current)}</w:t></w:r>`;
        current = '';
      }
      i++;
      let italicText = '';
      while (i < text.length && text[i] !== '*') {
        italicText += text[i];
        i++;
      }
      if (text[i] === '*') {
        xml += `<w:r><w:rPr><w:i/></w:rPr><w:t>${escapeXML(italicText)}</w:t></w:r>`;
        i++;
      } else {
        current += '*' + italicText;
      }
    }
    else {
      current += text[i];
      i++;
    }
  }
  
  if (current) {
    xml += `<w:r><w:t>${escapeXML(current)}</w:t></w:r>`;
  }
  
  return xml;
}

function escapeXML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add all files from source directory
    archive.directory(sourceDir, false);
    
    archive.finalize();
  });
}

// Fallback if archiver is not available
function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    // Try to use system zip command as fallback
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