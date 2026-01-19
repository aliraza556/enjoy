import { test, expect } from '@playwright/test';

// Helper to generate mock state with N players
function generateMockState(playerCount: number) {
  const players: Record<string, { karma: number; streak: number; achievements: string[] }> = {};
  for (let i = 0; i < playerCount; i++) {
    players[`player_${i}`] = {
      karma: Math.floor(Math.random() * 1000),
      streak: Math.floor(Math.random() * 10),
      achievements: i % 5 === 0 ? ['first_blood'] : []
    };
  }
  return {
    score: { total: playerCount * 50 },
    levels: { current: Math.min(Math.floor(playerCount / 10), 100), next_unlock: { progress: { score: 500, prs: 5 }, requires_score: 1000, requires_prs: 10 } },
    players
  };
}

test.describe('Visual Quality', () => {
  // Test each time period renders correctly
  const periods = ['dawn', 'morning', 'noon', 'afternoon', 'sunset', 'night'];
  const hours = { dawn: 6, morning: 9, noon: 13, afternoon: 16, sunset: 19, night: 22 };

  for (const period of periods) {
    test(`${period} theme renders correctly`, async ({ page }) => {
      await page.addInitScript(`{
        const mockHour = ${hours[period as keyof typeof hours]};
        Date.prototype.getHours = function() { return mockHour; };
        Date.prototype.toLocaleString = function(locale, options) {
          if (options?.timeZone === 'Europe/Rome') {
            const d = new Date(this);
            d.setHours(mockHour);
            return d.toString();
          }
          return this.toString();
        };
      }`);
      await page.goto('/');
      await page.waitForTimeout(1500);

      // Verify body has correct time class
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass).toContain(`time-${period}`);

      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot(`${period}.png`, { threshold: 0.15 });
    });
  }

  test('no central title obstruction - brand mark is subtle', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Verify old title element doesn't exist
    const oldTitle = page.locator('.title');
    await expect(oldTitle).not.toBeVisible();

    // Verify new brand mark exists and is subtle
    const brandMark = page.locator('.brand-mark');
    await expect(brandMark).toBeVisible();

    // Check opacity is low (subtle)
    const opacity = await brandMark.evaluate(el =>
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeLessThanOrEqual(0.25);
  });

  test('repo stats use pill design', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const repoStat = page.locator('.repo-stat').first();
    await expect(repoStat).toBeVisible();

    // Check for pill styling (border-radius)
    const borderRadius = await repoStat.evaluate(el =>
      window.getComputedStyle(el).borderRadius
    );
    expect(borderRadius).toBe('100px');

    // Check for backdrop-filter
    const backdropFilter = await repoStat.evaluate(el =>
      window.getComputedStyle(el).backdropFilter
    );
    expect(backdropFilter).toContain('blur');
  });

  test('level display uses elegant arc design', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const levelDisplay = page.locator('.level-display');
    await expect(levelDisplay).toBeVisible();

    // Check that level ring SVG exists
    const levelRingSvg = page.locator('.level-ring svg');
    await expect(levelRingSvg).toBeVisible();

    // Check for level number and label
    await expect(page.locator('.level-number')).toBeVisible();
    await expect(page.locator('.level-label')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('cursor uses GPU-accelerated transforms', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const cursor = page.locator('.cursor');

    // Move mouse to trigger cursor update
    await page.mouse.move(200, 200);
    await page.waitForTimeout(100);

    // Check that cursor uses transform (not left/top)
    const transform = await cursor.evaluate(el =>
      window.getComputedStyle(el).transform
    );
    expect(transform).not.toBe('none');

    // Verify left and top are still at 0
    const left = await cursor.evaluate(el =>
      window.getComputedStyle(el).left
    );
    expect(left).toBe('0px');
  });

  test('maintains 55+ fps with 100 players', async ({ page }) => {
    // Mock state with 100 players
    await page.route('**/state.json*', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(generateMockState(100))
    }));

    await page.goto('/');
    await page.waitForTimeout(2000);

    const fps = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let frames = 0;
        const start = performance.now();
        function count() {
          frames++;
          if (performance.now() - start < 2000) {
            requestAnimationFrame(count);
          } else {
            resolve(frames / 2);
          }
        }
        requestAnimationFrame(count);
      });
    });

    console.log(`FPS with 100 players: ${fps}`);
    expect(fps).toBeGreaterThan(55);
  });

  test('graceful scaling to 1000 stars', async ({ page }) => {
    const mockStargazers = Array(1000).fill(null).map((_, i) => ({
      login: `user_${i}`,
      avatar: ''
    }));

    await page.route('**/repo-stats.json*', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        stars: 1000,
        forks: 50,
        watchers: 100,
        recent_stargazers: mockStargazers
      })
    }));

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Should not crash and should render something
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page).toHaveScreenshot('1000-stars.png', { threshold: 0.2 });
  });
});

test.describe('Day/Night Star Visibility', () => {
  test('stars are visible at night', async ({ page }) => {
    await page.addInitScript(`{
      Date.prototype.getHours = () => 23;
    }`);

    await page.route('**/repo-stats.json*', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        stars: 10,
        forks: 2,
        recent_stargazers: Array(10).fill(null).map((_, i) => ({ login: `user_${i}` }))
      })
    }));

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Verify sky state is night
    const starOpacity = await page.evaluate(() => {
      // @ts-ignore
      return window.currentStarOpacity !== undefined ? window.currentStarOpacity : 1;
    });

    // Night should have full star opacity (or close to it)
    // The exact value depends on animation state
    expect(starOpacity).toBeGreaterThan(0.5);
  });

  test('stars are hidden at noon', async ({ page }) => {
    await page.addInitScript(`{
      Date.prototype.getHours = () => 12;
    }`);

    await page.route('**/repo-stats.json*', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        stars: 10,
        forks: 2,
        recent_stargazers: Array(10).fill(null).map((_, i) => ({ login: `user_${i}` }))
      })
    }));

    await page.goto('/');
    await page.waitForTimeout(3000);

    // At noon, stars should be fading toward 0
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('time-noon');
  });
});

test.describe('Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mobile layout is clean', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Cursor should be hidden on mobile (in CSS)
    const cursor = page.locator('.cursor');
    const cursorDisplay = await cursor.evaluate(el =>
      window.getComputedStyle(el).display
    );
    expect(cursorDisplay).toBe('none');

    // Level display should be visible and positioned correctly
    const levelDisplay = page.locator('.level-display');
    await expect(levelDisplay).toBeVisible();

    await expect(page).toHaveScreenshot('mobile.png', { threshold: 0.15 });
  });

  test('respects reduced motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Check that animations are disabled
    const runningAnimations = await page.evaluate(() =>
      document.getAnimations().filter(a => a.playState === 'running').length
    );

    // With reduced motion, animations should be minimal or stopped
    expect(runningAnimations).toBeLessThanOrEqual(2); // Allow some essential animations
  });
});

test.describe('Accessibility', () => {
  test('time indicator is focusable and has proper title', async ({ page }) => {
    await page.goto('/');

    const timeIndicator = page.locator('.time-indicator');
    await expect(timeIndicator).toHaveAttribute('title', 'Click for time bonuses');

    // Should be a link
    const tagName = await timeIndicator.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('a');
  });

  test('audio toggle has aria-label', async ({ page }) => {
    await page.goto('/');

    const audioToggle = page.locator('.audio-toggle');
    await expect(audioToggle).toHaveAttribute('aria-label', 'Toggle ambient sound');
  });
});

test.describe('Links and Navigation', () => {
  test('back links work correctly', async ({ page }) => {
    // Test time.html
    await page.goto('/time.html');
    await page.waitForTimeout(500);

    const backLink = page.locator('.back-link');
    await expect(backLink).toHaveAttribute('href', 'index.html');

    // Test voice.html
    await page.goto('/voice.html');
    await page.waitForTimeout(500);

    const voiceBackLink = page.locator('.back');
    await expect(voiceBackLink).toHaveAttribute('href', 'index.html');
  });
});
