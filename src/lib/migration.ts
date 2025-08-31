import { sql } from './neonDatabase';

// Dati quiz hardcoded da migrare
const hardcodedQuizData = {
  title: 'Quiz Finale - Evoluzione Normativa 2024',
  description: 'Verifica delle competenze acquisite durante il corso',
  time_limit: 30,
  passing_score: 85,
  max_attempts: 3,
  questions: [
    {
      question: 'Qual è la principale novità normativa introdotta nel 2024 per il trasporto pubblico locale?',
      options: [
        'Nuove regole per la sicurezza dei passeggeri',
        'Modifiche ai contratti di servizio',
        'Aggiornamenti sui controlli qualità',
        'Tutte le precedenti'
      ],
      correct_answer: 3,
      explanation: 'Il 2024 ha introdotto aggiornamenti significativi in tutti questi ambiti per migliorare il servizio di trasporto pubblico.',
      points: 1,
      order_num: 1
    },
    {
      question: 'Secondo le nuove normative, ogni quanto devono essere effettuati i controlli di qualità?',
      options: [
        'Ogni 6 mesi',
        'Ogni 3 mesi', 
        'Ogni anno',
        'Ogni 2 anni'
      ],
      correct_answer: 1,
      explanation: 'Le nuove disposizioni richiedono controlli trimestrali per garantire standard di qualità elevati.',
      points: 1,
      order_num: 2
    },
    {
      question: 'Quale documentazione è obbligatoria per gli operatori del trasporto pubblico locale?',
      options: [
        'Solo la licenza di guida',
        'Certificato di formazione professionale e attestato medico',
        'Solo l\'attestato medico',
        'Nessuna documentazione specifica'
      ],
      correct_answer: 1,
      explanation: 'Gli operatori devono possedere sia il certificato di formazione che l\'attestato medico valido.',
      points: 1,
      order_num: 3
    }
  ]
};

export async function migrateHardcodedQuizzes(): Promise<{ success: boolean; message: string; quizId?: string }> {
  try {
    console.log('🚀 Inizio migrazione quiz per tutti i corsi...');
    
    // 1. Ottieni tutti i corsi
    const allCourses = await sql`SELECT * FROM courses`;
    
    if (allCourses.length === 0) {
      return {
        success: false,
        message: 'Nessun corso trovato nel database'
      };
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Per ogni corso, crea moduli completi (introduzione, contenuti, quiz)
    for (const course of allCourses) {
      console.log(`🔄 Migrazione moduli completi per corso: ${course.title}`);
      
      // Verifica moduli esistenti per questo corso
      const existingModules = await sql`
        SELECT type FROM course_modules 
        WHERE course_id = ${course.id}
      `;
      
      const existingTypes = existingModules.map(m => m.type);
      let moduleId;
      
      // 1. Crea Modulo Introduzione se non esiste
      if (!existingTypes.includes('lesson')) {
        const introModule = await sql`
          INSERT INTO course_modules (course_id, title, type, content, duration, order_num, level)
          VALUES (
            ${course.id}, 
            'Introduzione al Corso', 
            'lesson', 
            'Panoramica generale degli argomenti che verranno trattati nel corso', 
            15, 
            1,
            ${course.level}
          )
          RETURNING id
        `;
        console.log(`✅ Modulo Introduzione creato per ${course.title}`);
      }
      
      // 2. Crea Modulo Contenuti Principali se non esiste  
      if (existingTypes.filter(t => t === 'lesson').length < 2) {
        const contentModule = await sql`
          INSERT INTO course_modules (course_id, title, type, content, duration, order_num, level)
          VALUES (
            ${course.id}, 
            'Contenuti Principali', 
            'lesson', 
            'Approfondimento dettagliato degli argomenti del corso con esempi pratici e casi studio', 
            45, 
            2,
            ${course.level}
          )
          RETURNING id
        `;
        console.log(`✅ Modulo Contenuti creato per ${course.title}`);
      }
      
      // 3. Crea o trova Modulo Quiz Finale
      let quizModules = await sql`
        SELECT id FROM course_modules 
        WHERE course_id = ${course.id} AND type = 'quiz'
        LIMIT 1
      `;
      
      if (quizModules.length === 0) {
        const quizModule = await sql`
          INSERT INTO course_modules (course_id, title, type, content, duration, order_num, level)
          VALUES (
            ${course.id}, 
            'Quiz Finale', 
            'quiz', 
            'Modulo di valutazione finale per verificare le competenze acquisite', 
            30, 
            3,
            ${course.level}
          )
          RETURNING id
        `;
        moduleId = quizModule[0].id;
        console.log(`✅ Modulo Quiz creato per ${course.title}`);
      } else {
        moduleId = quizModules[0].id;
        console.log(`ℹ️ Modulo Quiz esistente per ${course.title}`);
      }
      console.log(`✅ Modulo quiz creato per ${course.title}`);
      
      // Verifica se il quiz esiste già
      const existingQuiz = await sql`
        SELECT id FROM quizzes 
        WHERE module_id = ${moduleId}
        LIMIT 1
      `;
      
      if (existingQuiz.length > 0) {
        console.log(`⚠️ Quiz già esistente per ${course.title}`);
        skippedCount++;
        continue;
      }
      
      // Crea il quiz specifico per il corso
      let quizData, questions;
      
      if (course.title.includes('Evoluzione Normativa 2024')) {
        // Usa i dati hardcoded specifici
        quizData = hardcodedQuizData;
        questions = hardcodedQuizData.questions;
      } else {
        // Genera quiz generico per altri corsi
        quizData = {
          title: `Quiz Finale - ${course.title}`,
          description: `Verifica delle competenze acquisite nel corso "${course.title}"`,
          time_limit: 30,
          passing_score: course.passing_score || 70,
          max_attempts: 3
        };
        questions = generateCourseQuestions(course);
      }
      
      // Crea il quiz
      const quizResult = await sql`
        INSERT INTO quizzes (module_id, title, description, time_limit, passing_score, max_attempts)
        VALUES (${moduleId}, ${quizData.title}, ${quizData.description}, 
                ${quizData.time_limit}, ${quizData.passing_score}, ${quizData.max_attempts})
        RETURNING id
      `;
      
      const quizId = quizResult[0].id;
      console.log(`✅ Quiz creato per ${course.title}: ${quizId}`);
      
      // Crea le domande
      for (const question of questions) {
        await sql`
          INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation, points, order_num)
          VALUES (
            ${quizId}, 
            ${question.question}, 
            ${JSON.stringify(question.options)}, 
            ${question.correct_answer}, 
            ${question.explanation}, 
            ${question.points}, 
            ${question.order_num}
          )
        `;
      }
      
      migratedCount++;
    }
    
    return {
      success: true,
      message: `Migrazione completata! ${migratedCount} quiz creati, ${skippedCount} già esistenti`
    };
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    return {
      success: false,
      message: `Errore migrazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    };
  }
}

// Genera domande generiche per un corso
function generateCourseQuestions(course: any): any[] {
  return [
    {
      question: `Qual è l'obiettivo principale del corso "${course.title}"?`,
      options: [
        'Fornire una formazione completa sugli argomenti trattati',
        'Sostituire la formazione tradizionale',
        'Ridurre i costi di formazione',
        'Aumentare il numero di partecipanti'
      ],
      correct_answer: 0,
      explanation: 'Il corso mira a fornire una formazione completa e aggiornata sugli argomenti specifici trattati.',
      points: 1,
      order_num: 1
    },
    {
      question: `Quale livello di competenza è richiesto per il corso "${course.title}"?`,
      options: [
        course.level === 'beginner' ? 'Nessuna competenza specifica' : 'Competenze avanzate',
        course.level === 'intermediate' ? 'Competenze di base' : 'Competenze specialistiche',
        course.level === 'advanced' ? 'Esperienza consolidata' : 'Conoscenze teoriche',
        'Certificazioni professionali'
      ],
      correct_answer: course.level === 'beginner' ? 0 : course.level === 'intermediate' ? 1 : 2,
      explanation: `Questo corso è di livello ${course.level} e richiede competenze appropriate.`,
      points: 1,
      order_num: 2
    },
    {
      question: `Qual è la durata stimata del corso "${course.title}"?`,
      options: [
        course.duration || '2 ore',
        '30 minuti',
        '1 ora',
        '4 ore'
      ],
      correct_answer: 0,
      explanation: `La durata del corso è di ${course.duration || '2 ore'} come indicato nelle specifiche.`,
      points: 1,
      order_num: 3
    }
  ];
}

export async function checkMigrationStatus(): Promise<{ hasHardcodedQuiz: boolean; hasDatabaseQuiz: boolean; courseId?: string }> {
  try {
    // Verifica se esiste il corso
    const courseResult = await sql`
      SELECT id FROM courses 
      WHERE title ILIKE '%Evoluzione Normativa 2024%'
      LIMIT 1
    `;
    
    if (courseResult.length === 0) {
      return { hasHardcodedQuiz: true, hasDatabaseQuiz: false };
    }
    
    const courseId = courseResult[0].id;
    
    // Verifica se esiste già il quiz nel database
    const quizResult = await sql`
      SELECT id FROM quizzes 
      WHERE course_id = ${courseId} AND title = ${hardcodedQuizData.title}
    `;
    
    return {
      hasHardcodedQuiz: true,
      hasDatabaseQuiz: quizResult.length > 0,
      courseId: courseId
    };
    
  } catch (error) {
    console.error('Errore verifica migrazione:', error);
    return { hasHardcodedQuiz: true, hasDatabaseQuiz: false };
  }
}
