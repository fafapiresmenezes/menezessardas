/**
 * Trava: Nome (Branding validation)
 * 
 * Validates that published package contains ONLY:
 * - "Instituto THEYE" or "INSTITUTO THEYE" (correct branding)
 * - "THEYE" (platform name)
 * 
 * REJECTS:
 * - "Instituto DI" (old branding)
 * - "THEYE Institute" (incorrect English translation)
 * - "casa" or "house" (removed on 15/11/2026)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Trava: Nome — Branding Consistency', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  const sourceFiles = [
    'src/lib/i18n.ts',
    'public/manifest.webmanifest',
    'src/pages/LastroPage.tsx',
    'index.html',
  ];

  const invalidPatterns = [
    { pattern: /Instituto\s+DI\b/gi, name: 'Instituto DI' },
    { pattern: /THEYE\s+Institute\b/gi, name: 'THEYE Institute' },
    { pattern: /\bcasa\b/gi, name: 'casa (Portuguese)' },
    { pattern: /\bhouse\b/gi, name: 'house (English)' },
  ];

  sourceFiles.forEach((file) => {
    it(`${file} should not contain invalid branding patterns`, () => {
      const filePath = path.join(projectRoot, file);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const failures: string[] = [];

      invalidPatterns.forEach(({ pattern, name }) => {
        const matches = content.match(pattern);
        if (matches) {
          failures.push(`Found ${matches.length}x "${name}": ${matches.join(', ')}`);
        }
      });

      expect(failures, `${file} contains invalid branding`).toEqual([]);
    });
  });

  it('OG image file should exist at public/og-instituto.png', () => {
    const ogImagePath = path.join(projectRoot, 'public/og-instituto.png');
    expect(fs.existsSync(ogImagePath)).toBe(true);
    
    // Verify file is not empty (at least 1KB)
    const stats = fs.statSync(ogImagePath);
    expect(stats.size).toBeGreaterThan(1000);
  });

  it('manifest.webmanifest should use "Instituto THEYE"', () => {
    const manifestPath = path.join(projectRoot, 'public/manifest.webmanifest');
    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    expect(content.name).toMatch(/Instituto\s+THEYE/);
    expect(content.short_name).toMatch(/THEYE/);
    expect(content.name).not.toMatch(/Instituto\s+DI/);
    expect(content.name).not.toMatch(/casa|house/i);
  });

  it('i18n dictionary should have no "casa" or "house" in branding context', () => {
    const i18nPath = path.join(projectRoot, 'src/lib/i18n.ts');
    const content = fs.readFileSync(i18nPath, 'utf-8');
    
    // Extract Portuguese branding text (lines around "Padrão do Instituto")
    const ptMatch = content.match(/pt:\s*\{[\s\S]*?"Padrão do Instituto"[\s\S]*?\}/);
    if (ptMatch) {
      expect(ptMatch[0]).not.toMatch(/\bcasa\b/i);
    }
    
    // Extract English branding text (lines around "platform standard")
    const enMatch = content.match(/en:\s*\{[\s\S]*?"platform standard"[\s\S]*?\}/);
    if (enMatch) {
      expect(enMatch[0]).not.toMatch(/\bhouse\b/i);
    }
  });
});
