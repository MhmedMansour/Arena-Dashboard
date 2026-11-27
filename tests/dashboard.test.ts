import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { analyzeFileContent, mergeContentInsight } from '../src/services/contentClassifier';
import { extractFileText } from '../src/services/fileTextExtraction';
import { classifyFileSmart } from '../src/services/smartClassifier';
import { buildNavTabs, DEFAULT_TAB_ORDER } from '../src/components/navIcons';
import { DEFAULT_ASSISTANT_CONFIG, detectIntent, runOfflineAssistant, sendAssistantMessage, saveAssistantConfig, loadAssistantConfig } from '../src/services/assistantService';
import { parseAndValidateSnapshot, loadSettings } from '../src/services/syncService';
import { DEFAULT_SETTINGS, DEFAULT_CV_DATA } from '../src/data/mhmedSeedData';

const context = { dashboardName: 'اختبار', currentTab: 'overview' as const, projectCount: 2, workOrderCount: 1, fileCount: 5, archiveCount: 3 };
const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
} });

test('actual content overrides a misleading filename and keeps original format', async () => {
  const file = new File(['Electrical power distribution circuit cable voltage\nBill of quantities BOQ quantity rate amount'], 'HVAC.txt', { type: 'text/plain' });
  const base = await classifyFileSmart(file, [], []);
  const content = await analyzeFileContent(file);
  assert.ok(content);
  const merged = mergeContentInsight(base, content);
  assert.equal(merged.detectedDiscipline, 'كهرباء (Electrical)');
  assert.match(merged.suggestedCategory, /كميات|BOQ/);
  assert.equal(merged.extension, 'TXT');
  assert.equal(merged.analysisMethod, 'content-heuristic');
  assert.ok(merged.analysisNote.includes('محتوى'));
  assert.ok(merged.confidenceScore <= 94);
});

test('Arabic and UTF-16 content are read without the binary false positive', async () => {
  const text = 'تقرير فني كهرباء إنارة كهرباء كابلات جهد محول توزيع';
  const a = await analyzeFileContent(new File([text], '001.txt'));
  assert.ok(a);
  assert.equal(a.detectedDiscipline, 'كهرباء (Electrical)');
  const b = await extractFileText(new File([Buffer.from('\ufeff' + text, 'utf16le')], '002.txt'));
  assert.ok(b?.includes('تقرير'));
});

test('unknown, binary and misleading partial words do not claim content classification', async () => {
  for (const file of [new File(['\0'.repeat(500)], 'file.txt'), new File(['ordinary unrelated words to read today'], 'file.txt'), new File(['HVAC'], 'file.dwg'), new File(['profile office software unrelated information'], 'file.txt')]) {
    assert.equal(await analyzeFileContent(file), null);
  }
  assert.equal(await extractFileText(new File([new Uint8Array(21 * 1024 * 1024)], 'large.docx')), null);
});

test('DOCX/XLSX/PPTX text extraction reads contents rather than filenames', async () => {
  for (const [ext, path] of [['docx', 'word/document.xml'], ['xlsx', 'xl/sharedStrings.xml'], ['pptx', 'ppt/slides/slide1.xml']]) {
    const zip = zipSync({ [path]: strToU8('<root><t>HVAC chiller duct ventilation cooling</t><t>technical report</t></root>') });
    const content = await analyzeFileContent(new File([new Uint8Array(zip)], `000.${ext}`));
    assert.ok(content);
    assert.equal(content.detectedDiscipline, 'ميكانيكا وتكييف (MEP / HVAC)');
  }
});

test('navigation order is complete, unique and ignores unknown tabs', () => {
  const nav = buildNavTabs({ order: ['archive', 'archive', 'bad' as never], iconOverrides: { archive: 'bot' } });
  assert.equal(nav[0].id, 'archive');
  assert.equal(nav[0].iconName, 'bot');
  assert.equal(nav.length, DEFAULT_TAB_ORDER.length);
  assert.equal(new Set(nav.map((t) => t.id)).size, nav.length);
  assert.equal(buildNavTabs({ order: null as never }).length, DEFAULT_TAB_ORDER.length);
});

test('snapshot version 2 preserves new nav preferences and migrates old settings', () => {
  const settings = { ...DEFAULT_SETTINGS, workspace: { ...DEFAULT_SETTINGS.workspace, navOrder: [...DEFAULT_TAB_ORDER].reverse(), navIcons: { archive: 'bot' }, navPosition: 'left' as const } };
  const parsed = parseAndValidateSnapshot({ schemaVersion: 2, settings, cv: DEFAULT_CV_DATA, projects: [] });
  assert.deepEqual(parsed.settings.workspace, settings.workspace);
  const old = JSON.parse(JSON.stringify(settings));
  delete old.workspace.navOrder; delete old.workspace.navIcons; delete old.workspace.navPosition;
  const migrated = parseAndValidateSnapshot({ settings: old, cv: DEFAULT_CV_DATA, projects: [] });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.settings.workspace.navPosition, 'right');
  assert.deepEqual(loadSettings().workspace.navOrder, DEFAULT_TAB_ORDER);
});

test('only explicit user commands perform allowed actions', () => {
  assert.deepEqual(detectIntent('افتح الأرشيف الذكي'), { type: 'navigate', tab: 'archive' });
  assert.deepEqual(detectIntent('أضف مشروعاً جديداً'), { type: 'openModal', modal: 'new' });
  assert.deepEqual(detectIntent('غيّر الثيم والألوان'), { type: 'navigate', tab: 'settings', sub: 'appearance' });
  assert.deepEqual(detectIntent('افتح إعدادات القائمة'), { type: 'navigate', tab: 'settings', sub: 'workspace' });
  assert.deepEqual(detectIntent('افتح تصنيف الملفات'), { type: 'navigate', tab: 'archive' });
  assert.equal(detectIntent('كيف أفتح الأرشيف الذكي؟'), null);
  assert.equal(detectIntent('لا تفتح المشاريع'), null);
  assert.equal(detectIntent('تقرير عن المشاريع'), null);
  assert.equal(runOfflineAssistant('مرحبا', context).action, null);
});

test('assistant config never saves API keys', () => {
  saveAssistantConfig({ ...DEFAULT_ASSISTANT_CONFIG, apiKey: 'secret' } as never);
  assert.ok(![...memory.values()].some((value) => value.includes('secret')));
  assert.equal('apiKey' in loadAssistantConfig(), false);
});

test('offline assistant works without fetch', async () => {
  let output = '';
  await sendAssistantMessage(DEFAULT_ASSISTANT_CONFIG, [{ role: 'user', content: 'افتح المشاريع' }], {
    onToken: (text) => { output += text; }, onDone: (_, action) => assert.deepEqual(action, { type: 'navigate', tab: 'projects' }),
  }, context);
  assert.ok(output);
});

test('remote streaming handles split UTF-8 and final data without newline; model prose cannot execute', async () => {
  const original = globalThis.fetch;
  let sent: Record<string, any> = {};
  const wire = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"افتح المشاريع"}}]}');
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(init?.body as string);
    return new Response(new ReadableStream({ start(controller) {
      for (let i = 0; i < wire.length; i += 7) controller.enqueue(wire.slice(i, i + 7));
      controller.close();
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    let output = '';
    await sendAssistantMessage({ ...DEFAULT_ASSISTANT_CONFIG, provider: 'openai-compatible', endpointUrl: '/api/assistant' }, [{ role: 'user', content: 'مرحبا' }], {
      onToken: (delta) => { output += delta; }, onDone: (_, action) => assert.equal(action, null), onError: (message) => assert.fail(message),
    }, context);
    assert.equal(output, 'افتح المشاريع');
    assert.ok(sent.messages[0].content.includes('اختبار'));
  } finally { globalThis.fetch = original; }
});

test('Arabic articles and plural English words are recognized in content', async () => {
  const arabic = await analyzeFileContent(new File(['المواصفات الفنية للمخططات الكهربائية والإنارة والكابلات'], '000.txt'));
  assert.equal(arabic?.detectedDiscipline, 'كهرباء (Electrical)');
  const english = await analyzeFileContent(new File(['Mechanical cooling ducts chillers pumps specifications'], '000.csv'));
  assert.equal(english?.detectedDiscipline, 'ميكانيكا وتكييف (MEP / HVAC)');
});

test('remote JSON response and failures are handled without executing model instructions', async () => {
  const original = globalThis.fetch;
  const config = { ...DEFAULT_ASSISTANT_CONFIG, provider: 'openai-compatible' as const, endpointUrl: '/api/assistant' };
  try {
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: 'افتح المشاريع' } }] });
    let reply = '';
    await sendAssistantMessage(config, [{ role: 'user', content: 'كيف أضيف مشروع؟' }], {
      onToken: (text) => { reply += text; }, onDone: (_, action) => assert.equal(action, null), onError: (error) => assert.fail(error),
    }, context);
    assert.equal(reply, 'افتح المشاريع');
    globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
    let error = '';
    await sendAssistantMessage(config, [{ role: 'user', content: 'افتح المشاريع' }], {
      onError: (message) => { error = message; }, onDone: () => assert.fail('Failed requests must not execute actions'),
    }, context);
    assert.match(error, /503/);
  } finally { globalThis.fetch = original; }
});
