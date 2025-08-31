// Script per controllare i moduli esistenti nel database
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL);

async function checkModules() {
  try {
    // Trova il corso "Evoluzione Normativa 2025"
    const course = await sql`
      SELECT id, title FROM courses 
      WHERE title LIKE '%Evoluzione Normativa%'
      LIMIT 1
    `;
    
    if (course.length === 0) {
      console.log('❌ Corso non trovato');
      return;
    }
    
    console.log(`📚 Corso trovato: ${course[0].title} (ID: ${course[0].id})`);
    
    // Controlla tutti i moduli per questo corso
    const modules = await sql`
      SELECT id, title, type, duration, order_num 
      FROM course_modules 
      WHERE course_id = ${course[0].id}
      ORDER BY order_num ASC
    `;
    
    console.log(`\n📁 Moduli trovati (${modules.length}):`);
    modules.forEach((module, index) => {
      console.log(`${index + 1}. ${module.title} (${module.type}) - ${module.duration} min - Order: ${module.order_num}`);
    });
    
    if (modules.length === 0) {
      console.log('⚠️ Nessun modulo trovato per questo corso!');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkModules();
