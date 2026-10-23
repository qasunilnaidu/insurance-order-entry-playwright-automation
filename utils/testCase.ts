import { test } from '@playwright/test';
import catalogJson from '../fixtures/testCases.json';

export interface TestCaseMeta {
  id: string;
  title: string;
  module: string;
  validationId: string;
  requirement: string;
  riskId: string;
  severity: string;
  priority: string;
  wave: number;
  tags: string[];
  short: boolean;
  type: string;
  scenario: string;
  spec: string;
}

export interface TestDetails {
  tag: string[];
  annotation: { type: string; description: string }[];
}

const catalog = catalogJson as unknown as Record<string, TestCaseMeta>;

export function testCaseMeta(id: string): TestCaseMeta {
  const meta = catalog[id];
  if (!meta) throw new Error(`Test case ${id} is not in fixtures/testCases.json (regenerate it from the design sheet)`);
  return meta;
}

/**
 * Spread into test():  test(...tc('TC-AUTH-01'), async ({ pages }) => { ... })
 * Title, tags and annotations come from the Submission 2 design sheet, so reports trace
 * straight back to the sheet (ID, validation ID, risk, severity, priority, wave).
 *
 * Extra tags added automatically: @wave1/@wave2/@wave3, @short (30-35 test short-cohort set),
 * @critical, @p1/@p2/@p3.
 */
export function tc(id: string): [string, TestDetails] {
  const m = testCaseMeta(id);
  const tags = [...m.tags, `@wave${m.wave}`, `@${m.priority.toLowerCase()}`];
  if (m.short) tags.push('@short');
  if (m.severity === 'Critical') tags.push('@critical');

  const title = `${m.id}${m.validationId ? ` [${m.validationId}]` : ''} ${m.title}`;
  const annotation = [
    { type: 'test-case', description: m.id },
    { type: 'requirement', description: m.requirement },
    { type: 'risk', description: m.riskId },
    { type: 'severity', description: m.severity },
    { type: 'scenario', description: m.scenario },
  ].filter((a) => a.description);

  return [title, { tag: [...new Set(tags)], annotation }];
}

/**
 * The test exercises a live seeded defect (lab DB: SeededDefect.is_active = 1), so it FAILS BY DESIGN.
 * Do not weaken the assertion; the annotation makes the report read as the intended defect log.
 */
export function seededDefect(code: string): void {
  test.info().annotations.push({ type: 'seeded-defect', description: code });
}

/**
 * The app under test does not implement the behaviour this case checks, and no seeded defect covers it.
 * Reported as fixme (with the reason) instead of a failure.
 */
export function appGap(reason: string): void {
  test.info().annotations.push({ type: 'app-gap', description: reason });
  test.fixme(true, `APP-GAP: ${reason}`);
}
