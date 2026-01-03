import * as fs from 'fs';
import * as path from 'path';

// Define types locally/inline to avoid complexity if not transpiling this script with project tsconfig
type Taxonomy = {
    version: string;
    evidenceCategories: { id: string; title: string }[];
    keyQuestions: {
        id: string;
        title: string;
        displayOrder: number;
        qualityStatements: {
            id: string;
            code: string;
            title: string;
            displayOrder?: number;
        }[];
    }[];
};

const taxonomyPath = path.join(process.cwd(), 'seed/cqc.taxonomy.json');
const taxonomy: Taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'));

const lines: string[] = [];

// Insert evidence categories
for (const cat of taxonomy.evidenceCategories) {
    lines.push(
        `INSERT INTO evidence_categories (id, title) VALUES ('${cat.id}', '${cat.title.replace(/'/g, "''")}') ON CONFLICT DO NOTHING`
    );
}

// Insert key questions + quality statements
for (const kq of taxonomy.keyQuestions) {
    lines.push(
        `INSERT INTO cqc_key_questions (id, title, display_order) VALUES ('${kq.id}', '${kq.title}', ${kq.displayOrder}) ON CONFLICT DO NOTHING`
    );
    for (const qs of kq.qualityStatements) {
        lines.push(
            `INSERT INTO cqc_quality_statements (id, key_question_id, code, title, display_order, active) VALUES ('${qs.id}', '${kq.id}', '${qs.code}', '${qs.title.replace(/'/g, "''")}', ${qs.displayOrder || 1}, 1) ON CONFLICT DO NOTHING`
        );
    }
}

console.log(lines.join(';\n') + ';');
