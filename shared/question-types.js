// Per-subject question-TYPE suggestions for question-factory's "Question
// style / coverage" field (index.html auto-fills it when a Subject is
// picked; the user can still edit or clear it).
//
// KEYS ARE PRODUCTION WORDPRESS `subject` TERM NAMES, lower-cased — the same
// names topic-bank-sources.js's quizSubjectMap resolves to and the live
// taxonomy (window.questionSubjectTerms) carries. Never add a subject here
// that does not exist on examnotespdf.in; question-factory stays in sync
// with production taxonomy, not the other way round. A subject with no
// entry simply gets no auto-fill (GENERIC is only used when a prod subject
// has no researched list yet).
//
// Pedagogy / Mathematics / EVS lists are evidence-backed: derived by
// regex-classifying real previous-year question_en text in
// pyq-factory/.../PDF Generator/Input/*MASTER DATASET*.csv (239-339 rows per
// subject) and cross-checked against the trend-analysis docs' explicit
// format-shift callouts. CTET ENGLISH / Hindi are CSV-data-only. The rest
// are judgment calls, kept short on purpose.
(function(global){
  const BY_SUBJECT = {
    'pedagogy': [
      'direct conceptual (definition/principle recall)',
      'assertion-reason (new since 2024, now close to half the recent papers)',
      'fill-in-the-blank',
      'multi-statement "which of the following is/are true"',
      'classroom/case-based scenario',
      'theorist ↔ concept matching',
    ],
    'mathematics': [
      'direct calculation / conceptual',
      'multi-statement (i)/(ii)/(iii)/(iv) true-false',
      'error-analysis ("what mistake did the child make?")',
      'child heuristic/strategy identification ("what method did the child use?", new from 2026)',
      'number formation (greatest/least number from given digits)',
      'word problem / real-life application',
    ],
    'mathematics pedagogy': [
      'classroom/case-based scenario',
      'assertion-reason',
      'error-analysis / misconception diagnosis',
      'NCF/NCERT position on teaching mathematics',
      'assessment (formative, diagnostic, rubrics)',
    ],
    'evs': [
      'direct conceptual / factual',
      'assertion-reason (dominant since 2024, references NCF 2005 and NCF 2023)',
      'multi-statement "which of the following is/are true"',
      'classroom/case-based scenario',
      'fill-in-the-blank',
      'match the following',
    ],
    'evs-pedagogy': [
      'classroom/case-based scenario ("the teacher wants to...")',
      'assertion-reason',
      'assessment tools (rubrics, anecdotal records, portfolio)',
      'NCF 2005 / NCF 2023 position on EVS',
    ],
    'ctet english': [
      'direct grammar / usage',
      'classroom/case-based language-pedagogy scenario',
      'fill-in-the-blank',
      'multi-statement "which of the following is/are true"',
      'unseen passage comprehension (repeat the short passage in each question)',
      'vocabulary (synonym/antonym/one-word substitution)',
    ],
    'english': [
      'direct grammar / usage',
      'fill-in-the-blank / cloze',
      'unseen passage comprehension (repeat the short passage in each question)',
      'vocabulary (synonym/antonym/one-word substitution)',
      'error-spotting / sentence correction',
    ],
    'hindi': [
      'प्रत्यक्ष व्याकरण (संधि, समास, कारक)',
      'रिक्त स्थान भरो',
      'मुहावरे/लोकोक्तियाँ अर्थ-आधारित',
      'पर्यायवाची/विलोम शब्द',
      'अपठित गद्यांश बोध',
      'भाषा शिक्षाशास्त्र संकल्पनात्मक',
    ],
    'history': [
      'direct factual recall',
      'chronology / arrange in order',
      'cause-effect reasoning',
      'match the following (ruler/event ↔ date or place)',
    ],
    'general awareness': [
      'direct factual recall',
      'current-affairs linked',
      'match the following',
      'multi-statement "which of the following is/are correct"',
    ],
    'general awareness for delhi': [
      'direct factual recall (Delhi government, Article 239AA, departments, history, geography)',
      'multi-statement "which of the following is/are correct"',
      'match the following',
    ],
    'computer science': [
      'direct conceptual / definition',
      'code or output tracing',
      'number systems / binary / logic',
      'multi-statement "which of the following is/are correct"',
    ],
    'dsssb -special education': [
      'case-based (child profile / IEP scenario)',
      'direct conceptual (disability category, RPWD Act / RTE provision)',
      'assessment tool or strategy matching',
      'assertion-reason',
    ],
    'employability skills': [
      'direct conceptual',
      'workplace scenario-based',
      'fill-in-the-blank',
    ],
  };
  const GENERIC = [
    'direct conceptual',
    'assertion-reason',
    'case/scenario-based',
    'multi-statement "which of the following is/are true"',
  ];
  function normalize(s){ return String(s || '').trim().toLowerCase(); }
  function typesForSubject(subjectLabel){
    return BY_SUBJECT[normalize(subjectLabel)] || GENERIC;
  }
  // One line ready to drop into the "Question style / coverage" field.
  function coverageTextForSubject(subjectLabel){
    return 'a balanced mix of: ' + typesForSubject(subjectLabel).join('; ');
  }
  global.QuestionTypes = { BY_SUBJECT, GENERIC, typesForSubject, coverageTextForSubject };
})(typeof window !== 'undefined' ? window : this);
