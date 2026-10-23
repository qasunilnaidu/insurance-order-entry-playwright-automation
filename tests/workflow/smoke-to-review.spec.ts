import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForReview } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-WF-10'), async ({ agent }) => {
  const app = await applicationReadyForReview(agent);
  await expect(agent.page).toHaveURL(/\/review/);
  await agent.review.expectSummaryClean();
  await agent.review.expectSubmitEnabled();
  expect(app.id).toBeTruthy(); // nothing is submitted in this smoke path
});
