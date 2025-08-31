import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Carica variabili ambiente
dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL);

async function debugDatabase() {
  console.log('🔍 DEBUG DATABASE STATUS');
  console.log('========================');
  
  try {
    // 1. Verifica corsi
    const courses = await sql`SELECT id, title FROM courses ORDER BY title`;
    console.log(`📚 CORSI: ${courses.length}`);
    courses.forEach(c => console.log(`  - ${c.title} (${c.id})`));
    
    // 2. Verifica moduli
    const modules = await sql`
      SELECT cm.id, cm.title, cm.type, c.title as course_title 
      FROM course_modules cm 
      JOIN courses c ON cm.course_id = c.id 
      ORDER BY c.title, cm.order_num
    `;
    console.log(`\n🧩 MODULI: ${modules.length}`);
    modules.forEach(m => console.log(`  - ${m.course_title}: ${m.title} (${m.type})`));
    
    // 3. Verifica quiz
    const quizzes = await sql`
      SELECT q.id, q.title, cm.title as module_title, c.title as course_title
      FROM quizzes q
      JOIN course_modules cm ON q.module_id = cm.id
      JOIN courses c ON cm.course_id = c.id
      ORDER BY c.title
    `;
    console.log(`\n🎯 QUIZ: ${quizzes.length}`);
    quizzes.forEach(q => console.log(`  - ${q.course_title}: ${q.title}`));
    
    // 4. Verifica domande
    const questions = await sql`
      SELECT qq.id, qq.question, q.title as quiz_title
      FROM quiz_questions qq
      JOIN quizzes q ON qq.quiz_id = q.id
      ORDER BY q.title, qq.order_num
    `;
    console.log(`\n❓ DOMANDE: ${questions.length}`);
    questions.forEach(q => console.log(`  - ${q.quiz_title}: ${q.question.substring(0, 50)}...`));
    
    console.log('\n✅ Debug completato');
    
  } catch (error) {
    console.error('❌ Errore debug:', error);
  }
}

debugDatabase();
