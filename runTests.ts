#!/usr/bin/env node

/**
 * Script runner per i test del sistema quiz
 * Esegue diversi tipi di test in sequenza
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  duration?: number;
}

class QuizTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 AVVIO TESTING SISTEMA QUIZ');
    console.log('===============================\n');

    // Test 1: Verifica file esistenti
    await this.testFileExistence();
    
    // Test 2: Compilazione TypeScript
    await this.testCompilation();
    
    // Test 3: Test funzioni locali
    await this.testLocalFunctions();
    
    // Test 4: Test integrazione database (se disponibile)
    await this.testDatabaseIntegration();

    // Riepilogo risultati
    this.printSummary();
  }

  private async testFileExistence(): Promise<void> {
    console.log('📁 TEST 1: Verifica file esistenti');
    
    const requiredFiles = [
      'src/components/QuizInterface.tsx',
      'src/lib/neonDatabase.ts',
      'testQuizSystem.ts',
      'testQuizInterface.tsx'
    ];

    let allExist = true;
    
    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
      if (!exists) allExist = false;
    }

    this.results.push({
      name: 'File Existence',
      status: allExist ? 'success' : 'error',
      message: allExist ? 'Tutti i file richiesti esistono' : 'File mancanti rilevati'
    });

    console.log('');
  }

  private async testCompilation(): Promise<void> {
    console.log('🔧 TEST 2: Compilazione TypeScript');
    
    try {
      // Verifica sintassi TypeScript
      console.log('   Verifica sintassi QuizInterface.tsx...');
      execSync('npx tsc --noEmit src/components/QuizInterface.tsx', { stdio: 'pipe' });
      console.log('   ✅ QuizInterface.tsx - Sintassi OK');

      console.log('   Verifica sintassi neonDatabase.ts...');
      execSync('npx tsc --noEmit src/lib/neonDatabase.ts', { stdio: 'pipe' });
      console.log('   ✅ neonDatabase.ts - Sintassi OK');

      this.results.push({
        name: 'TypeScript Compilation',
        status: 'success',
        message: 'Compilazione TypeScript completata senza errori'
      });

    } catch (error) {
      console.log('   ❌ Errori di compilazione rilevati');
      console.log('   ', (error as any).stdout?.toString() || (error as any).message);
      
      this.results.push({
        name: 'TypeScript Compilation',
        status: 'error',
        message: 'Errori di compilazione TypeScript'
      });
    }

    console.log('');
  }

  private async testLocalFunctions(): Promise<void> {
    console.log('⚡ TEST 3: Test funzioni locali');
    
    try {
      console.log('   Esecuzione quick test...');
      execSync('npx tsx testQuizSystem.ts 2', { stdio: 'inherit' });
      
      this.results.push({
        name: 'Local Functions',
        status: 'success',
        message: 'Test funzioni locali completato'
      });

    } catch (error) {
      console.log('   ❌ Errore nei test funzioni locali');
      
      this.results.push({
        name: 'Local Functions',
        status: 'error',
        message: 'Errore nei test funzioni locali'
      });
    }

    console.log('');
  }

  private async testDatabaseIntegration(): Promise<void> {
    console.log('🗄️  TEST 4: Test integrazione database');
    
    // Verifica se il database è configurato
    const hasDbConfig = process.env.VITE_DATABASE_URL || fs.existsSync('.env');
    
    if (!hasDbConfig) {
      console.log('   ⚠️  Database non configurato - SKIP');
      this.results.push({
        name: 'Database Integration',
        status: 'skipped',
        message: 'Database non configurato (VITE_DATABASE_URL mancante)'
      });
      console.log('');
      return;
    }

    try {
      console.log('   Esecuzione test completo database...');
      execSync('npx tsx testQuizSystem.ts 1', { stdio: 'inherit' });
      
      this.results.push({
        name: 'Database Integration',
        status: 'success',
        message: 'Test integrazione database completato'
      });

    } catch (error) {
      console.log('   ❌ Errore nei test database');
      
      this.results.push({
        name: 'Database Integration',
        status: 'error',
        message: 'Errore nei test integrazione database'
      });
    }

    console.log('');
  }

  private printSummary(): void {
    console.log('📊 RIEPILOGO RISULTATI TEST');
    console.log('============================');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    this.results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'error' ? '❌' : '⚠️';
      
      console.log(`${icon} ${result.name}: ${result.message}`);
      
      if (result.status === 'success') successCount++;
      else if (result.status === 'error') errorCount++;
      else skippedCount++;
    });

    console.log('');
    console.log(`📈 Totale: ${this.results.length} test`);
    console.log(`✅ Successi: ${successCount}`);
    console.log(`❌ Errori: ${errorCount}`);
    console.log(`⚠️  Saltati: ${skippedCount}`);
    console.log('');

    if (errorCount === 0) {
      console.log('🎉 TUTTI I TEST DISPONIBILI COMPLETATI CON SUCCESSO!');
    } else {
      console.log('⚠️  ALCUNI TEST HANNO RIPORTATO ERRORI - VERIFICA I DETTAGLI SOPRA');
    }
  }
}

// Esecuzione
if (require.main === module) {
  const runner = new QuizTestRunner();
  runner.runAllTests().catch(console.error);
}

export default QuizTestRunner;
