const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});

project.addSourceFilesAtPaths(['app/**/*.ts', 'app/**/*.tsx', 'lib/**/*.ts', 'components/**/*.tsx']);

let changedFiles = 0;

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;

  // Find all CallExpressions
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const callExpr of callExpressions) {
    const expr = callExpr.getExpression();
    if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
      const propAccess = expr;
      const name = propAccess.getName();
      const expressionText = propAccess.getExpression().getText();
      
      // We are looking for .get, .all, .run
      if (['get', 'all', 'run'].includes(name)) {
        // The expression should be either `db.prepare(...)` or `stmt` or `checkStmt` etc.
        if (expressionText.includes('prepare') || expressionText.includes('Stmt') || expressionText === 'stmt') {
          // Check if it's already awaited
          const parent = callExpr.getParent();
          if (parent && parent.getKind() !== SyntaxKind.AwaitExpression) {
            callExpr.replaceWithText(`await ${callExpr.getText()}`);
            changed = true;
          }
        }
      }

      // We are looking for db.exec
      if (name === 'exec' && expressionText === 'db') {
        const parent = callExpr.getParent();
        if (parent && parent.getKind() !== SyntaxKind.AwaitExpression) {
          callExpr.replaceWithText(`await ${callExpr.getText()}`);
          changed = true;
        }
      }
    }
  }

  // Remove db.pragma calls entirely
  const pragmaCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).filter(c => {
    return c.getExpression().getText() === 'db.pragma';
  });
  for (const p of pragmaCalls) {
    const statement = p.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
    if (statement) {
      statement.remove();
      changed = true;
    }
  }

  // Remove `import Database from 'better-sqlite3';`
  const imports = sourceFile.getImportDeclarations();
  for (const imp of imports) {
    if (imp.getModuleSpecifierValue() === 'better-sqlite3') {
      imp.remove();
      changed = true;
    }
  }

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated ${sourceFile.getFilePath()}`);
    changedFiles++;
  }
}

console.log(`Successfully updated ${changedFiles} files.`);
